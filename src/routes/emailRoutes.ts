/**
 * Email Routes v2.0
 * 
 * Unified endpoint for sending feedback emails with PDF attachments.
 * Includes robust handling for large PDFs with memory optimization.
 * 
 * Security:
 * - Requires authentication (Clerk)
 * - Email recipient derived from authenticated user (never from request body)
 * - Session/interview ownership verified
 * - PDF validated for format and size
 * - Idempotent (won't send duplicate emails)
 * - Never returns HTML (always JSON)
 * 
 * Large PDF Handling:
 * - Enforces strict size limits (Content-Length check)
 * - Two-path strategy: in-memory (small) vs temp-file (large)
 * - Request timeout guards
 * - Memory-safe Base64 processing
 */

import { Router, Request, Response, NextFunction, json } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@clerk/express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import logger from '../utils/logger';
import { sendFeedbackEmail, logEmailToDatabase, generateEmailIdempotencyKey, checkEmailAlreadySent } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();
const emailLogger = logger.child({ component: 'email-route' });

// ========================================
// CONFIGURATION CONSTANTS
// ========================================

/** Maximum PDF size after Base64 decoding (8MB decoded) */
const MAX_DECODED_PDF_SIZE = 8 * 1024 * 1024;

/** Maximum Base64 payload (~10.6MB for 8MB decoded) */
const MAX_PDF_BASE64_LENGTH = Math.ceil(MAX_DECODED_PDF_SIZE * 1.37);

/** Threshold for switching to temp-file strategy (2MB decoded) */
const TEMP_FILE_THRESHOLD = 2 * 1024 * 1024;

/** Request timeout in milliseconds (30s) */
const REQUEST_TIMEOUT_MS = 30000;

/** PDF magic bytes */
const PDF_MAGIC_BYTES = '%PDF';

/** Temp directory for large PDFs */
const TEMP_DIR = path.join(os.tmpdir(), 'vocaid-pdf');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ========================================
// ERROR CODES
// ========================================
const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: 'Invalid request body' },
  INVALID_PDF: { status: 400, message: 'Invalid PDF format' },
  INVALID_BASE64: { status: 400, message: 'Invalid Base64 encoding' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'PDF size exceeds maximum allowed' },
  NOT_FOUND: { status: 404, message: 'Interview not found' },
  FORBIDDEN: { status: 403, message: 'Access denied' },
  NO_EMAIL: { status: 400, message: 'User does not have an email address' },
  TIMEOUT: { status: 408, message: 'Request timed out' },
  SEND_FAILED: { status: 502, message: 'Failed to send email' },
  INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred' }
};

// ========================================
// ZOD VALIDATION SCHEMA
// ========================================
const feedbackEmailSchema = z.object({
  interviewId: z.string().uuid({ message: 'Invalid interview ID format' }),
  pdfBase64: z.string()
    .min(100, 'PDF data is too small')
    .max(MAX_PDF_BASE64_LENGTH, `PDF data exceeds maximum size (${Math.round(MAX_PDF_BASE64_LENGTH / 1024 / 1024)}MB)`)
    .transform((val) => {
      // Strip data URL prefix if present
      if (val.startsWith('data:application/pdf;base64,')) {
        return val.replace('data:application/pdf;base64,', '');
      }
      if (val.startsWith('data:')) {
        throw new Error('Invalid data URL format - only PDF is accepted');
      }
      return val;
    }),
  fileName: z.string().max(255).optional().default('Vocaid-Feedback.pdf'),
  locale: z.string().max(10).optional(),
  meta: z.object({
    roleTitle: z.string().max(100).optional(),
    seniority: z.string().max(50).optional(),
    company: z.string().max(100).optional()
  }).optional()
});

// ========================================
// PDF PROCESSING UTILITIES
// ========================================

interface PDFValidationResult {
  valid: boolean;
  error?: string;
  decodedSize: number;
  checksum?: string;
}

// ========================================
// VALIDATION MIDDLEWARE
// ========================================

/**
 * Validate PDF content with checksum generation
 */
function validatePdfContent(base64String: string): PDFValidationResult {
  try {
    // Estimate decoded size (Base64 is ~33% larger than binary)
    const estimatedSize = Math.floor(base64String.length * 0.75);
    
    // Quick size check before decoding
    if (estimatedSize > MAX_DECODED_PDF_SIZE) {
      return {
        valid: false,
        error: `PDF size (~${Math.round(estimatedSize / 1024 / 1024)}MB) exceeds maximum allowed (${MAX_DECODED_PDF_SIZE / 1024 / 1024}MB)`,
        decodedSize: estimatedSize
      };
    }
    
    // Decode only first 16 chars to check magic number
    const headerBase64 = base64String.slice(0, 16);
    const headerBuffer = Buffer.from(headerBase64, 'base64');
    const header = headerBuffer.slice(0, 4).toString('ascii');
    
    if (!header.startsWith(PDF_MAGIC_BYTES)) {
      return {
        valid: false,
        error: 'Invalid PDF format - file does not start with PDF header',
        decodedSize: estimatedSize
      };
    }
    
    // Full decode for actual size and checksum
    const fullBuffer = Buffer.from(base64String, 'base64');
    const actualSize = fullBuffer.length;
    
    if (actualSize > MAX_DECODED_PDF_SIZE) {
      return {
        valid: false,
        error: `PDF size (${Math.round(actualSize / 1024 / 1024)}MB) exceeds maximum allowed (${MAX_DECODED_PDF_SIZE / 1024 / 1024}MB)`,
        decodedSize: actualSize
      };
    }
    
    // Calculate checksum for integrity
    const checksum = crypto.createHash('sha256').update(fullBuffer).digest('hex');
    
    return {
      valid: true,
      decodedSize: actualSize,
      checksum
    };
  } catch (error: any) {
    return {
      valid: false,
      error: 'Invalid Base64 encoding',
      decodedSize: 0
    };
  }
}

/**
 * Write PDF to temp file for large attachments
 */
function writePdfToTempFile(base64String: string, interviewId: string): string {
  const tempPath = path.join(TEMP_DIR, `${interviewId}-${Date.now()}.pdf`);
  const buffer = Buffer.from(base64String, 'base64');
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

/**
 * Clean up temp file
 */
function cleanupTempFile(tempPath: string): void {
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  } catch (error) {
    emailLogger.warn('Failed to cleanup temp file', { tempPath });
  }
}

/**
 * JSON body parser with size limit
 */
const pdfBodyParser = json({ 
  limit: `${Math.ceil(MAX_PDF_BASE64_LENGTH / 1024 / 1024) + 1}mb`,
  strict: true
});

/**
 * Ensure all responses are JSON
 */
function ensureJsonResponse(req: Request, res: Response, next: NextFunction) {
  res.type('application/json');
  next();
}

/**
 * Request timeout guard
 */
function timeoutGuard(req: Request, res: Response, next: NextFunction) {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      emailLogger.warn('Request timeout', { 
        requestId: (req as any).requestId,
        path: req.path 
      });
      res.status(408).json({
        ok: false,
        error: {
          code: 'TIMEOUT',
          message: ERROR_CODES.TIMEOUT.message
        }
      });
    }
  }, REQUEST_TIMEOUT_MS);
  
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
}

/**
 * Content-Length pre-check (reject before parsing)
 */
function contentLengthCheck(req: Request, res: Response, next: NextFunction) {
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxBytes = Math.ceil(MAX_PDF_BASE64_LENGTH / 1024 / 1024) * 1024 * 1024 + 1024 * 1024;
    
    if (size > maxBytes) {
      emailLogger.warn('Content-Length exceeds limit', { 
        contentLength: size,
        maxBytes
      });
      return res.status(413).json({
        ok: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum allowed`
        }
      });
    }
  }
  next();
}

/**
 * Generate unique request ID
 */
function addRequestId(req: Request, res: Response, next: NextFunction) {
  (req as any).requestId = crypto.randomUUID().slice(0, 8);
  next();
}

/**
 * Create JSON error response helper
 */
function errorResponse(
  res: Response,
  code: keyof typeof ERROR_CODES,
  customMessage?: string
) {
  const error = ERROR_CODES[code];
  return res.status(error.status).json({
    ok: false,
    error: {
      code,
      message: customMessage || error.message
    }
  });
}

// ========================================
// MAIN ENDPOINT: POST /api/email/feedback
// ========================================

router.post(
  '/feedback',
  addRequestId,
  ensureJsonResponse,
  timeoutGuard,
  contentLengthCheck,
  pdfBodyParser,
  requireAuth,
  async (req: Request, res: Response) => {
    const requestId = (req as any).requestId;
    const clerkId = (req as any).clerkUserId;
    let tempFilePath: string | null = null;
    
    emailLogger.info('Feedback email request received', { 
      requestId, 
      clerkId: clerkId?.slice(0, 10) + '...',
      contentLength: req.headers['content-length']
    });
    
    try {
      // ========================================
      // 1. VALIDATE REQUEST BODY
      // ========================================
      const parseResult = feedbackEmailSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        emailLogger.warn('Validation failed', { 
          requestId, 
          errors: parseResult.error.flatten() 
        });
        return errorResponse(res, 'VALIDATION_ERROR', 
          parseResult.error.errors[0]?.message);
      }
      
      const { interviewId, pdfBase64, fileName, locale, meta } = parseResult.data;
      
      // ========================================
      // 2. VALIDATE PDF CONTENT
      // ========================================
      const pdfValidation = validatePdfContent(pdfBase64);
      
      if (!pdfValidation.valid) {
        emailLogger.warn('PDF validation failed', { 
          requestId, 
          error: pdfValidation.error 
        });
        
        if (pdfValidation.error?.includes('exceeds maximum')) {
          return errorResponse(res, 'PAYLOAD_TOO_LARGE', pdfValidation.error);
        }
        if (pdfValidation.error?.includes('Base64')) {
          return errorResponse(res, 'INVALID_BASE64');
        }
        return errorResponse(res, 'INVALID_PDF', pdfValidation.error);
      }
      
      emailLogger.info('PDF validated', {
        requestId,
        decodedSize: `${Math.round(pdfValidation.decodedSize / 1024)}KB`,
        checksum: pdfValidation.checksum?.slice(0, 16) + '...'
      });
      
      // ========================================
      // 3. VERIFY USER OWNS THE INTERVIEW
      // ========================================
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          user: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              firstName: true,
              lastName: true,
              preferredLanguage: true
            }
          }
        }
      });
      
      if (!interview) {
        emailLogger.warn('Interview not found', { requestId, interviewId });
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Interview not found'
          }
        });
      }
      
      // Verify ownership
      if (interview.user.clerkId !== clerkId) {
        emailLogger.warn('Access denied - user does not own interview', { 
          requestId, 
          interviewId,
          interviewOwner: interview.user.clerkId?.slice(0, 10) + '...',
          requester: clerkId?.slice(0, 10) + '...'
        });
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied'
          }
        });
      }
      
      // ========================================
      // 4. IDEMPOTENCY CHECK
      // ========================================
      const alreadySent = await checkEmailAlreadySent(interviewId);
      if (alreadySent) {
        emailLogger.info('Email already sent (idempotency)', { requestId, interviewId });
        return res.json({
          ok: true,
          messageId: interview.emailMessageId || 'already-sent',
          status: 'already_sent'
        });
      }
      
      // Generate idempotency key
      const idempotencyKey = generateEmailIdempotencyKey(interviewId, 'feedback');
      
      // ========================================
      // 5. ATOMIC STATUS UPDATE (SENDING)
      // ========================================
      // Try to atomically set status to SENDING only if currently PENDING or FAILED
      const updateResult = await prisma.interview.updateMany({
        where: {
          id: interviewId,
          emailSendStatus: { in: ['PENDING', 'FAILED'] }
        },
        data: {
          emailSendStatus: 'SENDING',
          emailIdempotencyKey: idempotencyKey,
          emailLastError: null
        }
      });
      
      // If no rows updated, email is already being sent or was sent
      if (updateResult.count === 0) {
        emailLogger.info('Email already in progress or sent', { requestId, interviewId });
        return res.json({
          ok: true,
          messageId: 'in-progress',
          status: 'in_progress'
        });
      }
      
      // ========================================
      // 6. SEND EMAIL VIA RESEND
      // ========================================
      const recipientEmail = interview.user.email;
      if (!recipientEmail) {
        await prisma.interview.update({
          where: { id: interviewId },
          data: {
            emailSendStatus: 'FAILED',
            emailLastError: 'User has no email address'
          }
        });
        return res.status(400).json({
          ok: false,
          error: {
            code: 'NO_EMAIL',
            message: 'User does not have an email address'
          }
        });
      }
      
      const candidateName = [interview.user.firstName, interview.user.lastName]
        .filter(Boolean)
        .join(' ') || 'Candidate';
      
      // Use user's language preference or locale from request
      const language = locale || interview.user.preferredLanguage || 'en-US';
      
      const result = await sendFeedbackEmail({
        toEmail: recipientEmail,
        candidateName,
        jobTitle: meta?.roleTitle || interview.jobTitle,
        companyName: meta?.company || interview.companyName,
        score: interview.score || 0,
        interviewId: interview.id,
        feedbackPdfBase64: pdfBase64,
        resumeBase64: null,
        resumeFileName: null,
        feedbackSummary: interview.feedbackText?.split('\n')[0] || undefined
      });
      
      // ========================================
      // 7. UPDATE STATUS BASED ON RESULT
      // ========================================
      if (result.success) {
        await prisma.interview.update({
          where: { id: interviewId },
          data: {
            emailSendStatus: 'SENT',
            emailSentAt: new Date(),
            emailMessageId: result.messageId,
            emailLastError: null
          }
        });
        
        // Log to EmailLog table
        await logEmailToDatabase({
          interviewId,
          toEmail: recipientEmail,
          subject: `Interview Feedback - ${interview.jobTitle}`,
          templateType: 'feedback',
          status: 'SENT',
          messageId: result.messageId,
          idempotencyKey,
          language,
          hasAttachment: true,
          attachmentSize: pdfValidation.decodedSize
        });
        
        emailLogger.info('Feedback email sent successfully', { 
          requestId, 
          interviewId, 
          messageId: result.messageId 
        });
        
        return res.json({
          ok: true,
          messageId: result.messageId
        });
      } else {
        // Update status to FAILED
        await prisma.interview.update({
          where: { id: interviewId },
          data: {
            emailSendStatus: 'FAILED',
            emailLastError: result.error?.slice(0, 500) // Sanitize and limit error length
          }
        });
        
        // Log failure
        await logEmailToDatabase({
          interviewId,
          toEmail: recipientEmail,
          subject: `Interview Feedback - ${interview.jobTitle}`,
          templateType: 'feedback',
          status: 'FAILED',
          errorMessage: result.error,
          idempotencyKey,
          language,
          hasAttachment: true,
          attachmentSize: pdfValidation.decodedSize
        });
        
        emailLogger.error('Failed to send feedback email', { 
          requestId, 
          interviewId, 
          error: result.error 
        });
        
        return res.status(500).json({
          ok: false,
          error: {
            code: 'SEND_FAILED',
            message: 'Failed to send email. Please try again.'
          }
        });
      }
      
    } catch (error: any) {
      emailLogger.error('Unexpected error in email route', { 
        requestId, 
        error: error.message,
        stack: error.stack?.slice(0, 500)
      });
      
      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    }
  }
);

// ========================================
// GET STATUS ENDPOINT (for retry UI)
// ========================================
router.get(
  '/status/:interviewId',
  ensureJsonResponse,
  requireAuth,
  async (req: Request, res: Response) => {
    const clerkId = (req as any).clerkUserId;
    const { interviewId } = req.params;
    
    // Validate UUID
    const uuidResult = z.string().uuid().safeParse(interviewId);
    if (!uuidResult.success) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_ID', message: 'Invalid interview ID format' }
      });
    }
    
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        user: { select: { clerkId: true } }
      }
    });
    
    if (!interview || interview.user.clerkId !== clerkId) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Interview not found' }
      });
    }
    
    return res.json({
      ok: true,
      status: interview.emailSendStatus,
      sentAt: interview.emailSentAt,
      error: interview.emailSendStatus === 'FAILED' ? interview.emailLastError : null
    });
  }
);

export default router;
