/**
 * Leads Service
 * Handles lead capture for demo requests and early access signups
 */

import { PrismaClient, LeadType, LeadSource, Lead } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const leadsLogger = logger.child({ component: 'leads' });

// ========================================
// INTERFACES
// ========================================

export interface CreateLeadParams {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  type: LeadType;
  source?: LeadSource;
  teamSize?: string;
  useCase?: string;
  interestedModules?: string[];
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

export interface LeadResult {
  success: boolean;
  lead?: Lead;
  error?: string;
  isDuplicate?: boolean;
}

export interface LeadQueryParams {
  type?: LeadType;
  contacted?: boolean;
  limit?: number;
  offset?: number;
}

// ========================================
// LEAD CAPTURE
// ========================================

/**
 * Create a new lead
 * Handles both demo requests and early access signups
 */
export async function createLead(params: CreateLeadParams): Promise<LeadResult> {
  const {
    name,
    email,
    company,
    phone,
    type,
    source = LeadSource.LANDING_PAGE,
    teamSize,
    useCase,
    interestedModules = [],
    ipAddress,
    userAgent,
    referrer,
  } = params;

  try {
    // Check for existing lead with same email and type within last 24 hours
    const existingLead = await prisma.lead.findFirst({
      where: {
        email: email.toLowerCase(),
        type,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingLead) {
      leadsLogger.info('Duplicate lead submission detected', {
        email: email.toLowerCase(),
        type,
        existingLeadId: existingLead.id,
      });

      return {
        success: true,
        lead: existingLead,
        isDuplicate: true,
      };
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        type,
        source,
        teamSize: teamSize || null,
        useCase: useCase || null,
        interestedModules,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        referrer: referrer || null,
      },
    });

    leadsLogger.info('Lead created successfully', {
      leadId: lead.id,
      type: lead.type,
      email: lead.email,
      source: lead.source,
    });

    return {
      success: true,
      lead,
    };
  } catch (error: any) {
    leadsLogger.error('Failed to create lead', {
      error: error.message,
      email,
      type,
    });

    return {
      success: false,
      error: error.message || 'Failed to create lead',
    };
  }
}

/**
 * Get leads with optional filtering
 */
export async function getLeads(params: LeadQueryParams = {}): Promise<Lead[]> {
  const { type, contacted, limit = 50, offset = 0 } = params;

  try {
    const leads = await prisma.lead.findMany({
      where: {
        ...(type && { type }),
        ...(contacted !== undefined && { contacted }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return leads;
  } catch (error: any) {
    leadsLogger.error('Failed to fetch leads', { error: error.message });
    throw error;
  }
}

/**
 * Mark a lead as contacted
 */
export async function markLeadContacted(
  leadId: string,
  notes?: string
): Promise<Lead | null> {
  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        contacted: true,
        contactedAt: new Date(),
        notes: notes || null,
      },
    });

    leadsLogger.info('Lead marked as contacted', {
      leadId: lead.id,
      email: lead.email,
    });

    return lead;
  } catch (error: any) {
    leadsLogger.error('Failed to mark lead as contacted', {
      error: error.message,
      leadId,
    });
    return null;
  }
}

/**
 * Get lead statistics
 */
export async function getLeadStats(): Promise<{
  total: number;
  demoRequests: number;
  earlyAccess: number;
  contacted: number;
  pending: number;
  lastWeek: number;
}> {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, demoRequests, earlyAccess, contacted, lastWeek] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { type: LeadType.DEMO_REQUEST } }),
        prisma.lead.count({ where: { type: LeadType.EARLY_ACCESS } }),
        prisma.lead.count({ where: { contacted: true } }),
        prisma.lead.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      ]);

    return {
      total,
      demoRequests,
      earlyAccess,
      contacted,
      pending: total - contacted,
      lastWeek,
    };
  } catch (error: any) {
    leadsLogger.error('Failed to get lead stats', { error: error.message });
    throw error;
  }
}

export default {
  createLead,
  getLeads,
  markLeadContacted,
  getLeadStats,
};
