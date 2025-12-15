/**
 * Signup Abuse Prevention Service
 * Prevents users from creating multiple accounts to claim free credits
 * 
 * Features:
 * - IP address tracking
 * - Device fingerprint tracking
 * - Suspicious activity flagging
 */

import { prisma, dbLogger } from './databaseService';

// Configuration: How many accounts from same IP/fingerprint before blocking free credits
const MAX_ACCOUNTS_PER_IP = parseInt(process.env.MAX_ACCOUNTS_PER_IP || '2', 10);
const MAX_ACCOUNTS_PER_FINGERPRINT = parseInt(process.env.MAX_ACCOUNTS_PER_FINGERPRINT || '1', 10);

export interface SignupInfo {
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}

export interface AbuseCheckResult {
  allowFreeCredit: boolean;
  isSuspicious: boolean;
  suspicionReason?: string;
  existingAccountsFromIP: number;
  existingAccountsFromFingerprint: number;
}

/**
 * Check if a new signup should receive free credits
 * Based on IP and device fingerprint analysis
 */
export async function checkSignupAbuse(signupInfo: SignupInfo): Promise<AbuseCheckResult> {
  const { ipAddress, deviceFingerprint } = signupInfo;
  
  let existingAccountsFromIP = 0;
  let existingAccountsFromFingerprint = 0;
  let isSuspicious = false;
  let suspicionReason: string | undefined;

  // Check accounts from same IP
  if (ipAddress) {
    existingAccountsFromIP = await prisma.signupRecord.count({
      where: {
        ipAddress,
        freeCreditGranted: true
      }
    });

    if (existingAccountsFromIP >= MAX_ACCOUNTS_PER_IP) {
      isSuspicious = true;
      suspicionReason = `Multiple accounts (${existingAccountsFromIP}) from same IP address`;
      dbLogger.warn('Suspicious signup: multiple accounts from same IP', {
        ipAddress: ipAddress.substring(0, 10) + '...',
        existingAccounts: existingAccountsFromIP
      });
    }
  }

  // Check accounts from same device fingerprint (more reliable than IP)
  if (deviceFingerprint) {
    existingAccountsFromFingerprint = await prisma.signupRecord.count({
      where: {
        deviceFingerprint,
        freeCreditGranted: true
      }
    });

    if (existingAccountsFromFingerprint >= MAX_ACCOUNTS_PER_FINGERPRINT) {
      isSuspicious = true;
      suspicionReason = `Multiple accounts (${existingAccountsFromFingerprint}) from same device`;
      dbLogger.warn('Suspicious signup: multiple accounts from same device', {
        fingerprint: deviceFingerprint.substring(0, 10) + '...',
        existingAccounts: existingAccountsFromFingerprint
      });
    }
  }

  // Decide if free credit should be granted
  // Block if device fingerprint matches (strongest signal)
  // Or if too many accounts from same IP
  const allowFreeCredit = !isSuspicious;

  dbLogger.info('Signup abuse check completed', {
    allowFreeCredit,
    isSuspicious,
    existingAccountsFromIP,
    existingAccountsFromFingerprint
  });

  return {
    allowFreeCredit,
    isSuspicious,
    suspicionReason,
    existingAccountsFromIP,
    existingAccountsFromFingerprint
  };
}

/**
 * Record signup information for a new user
 */
export async function recordSignup(
  userId: string,
  signupInfo: SignupInfo,
  freeCreditGranted: boolean,
  isSuspicious: boolean = false,
  suspicionReason?: string
) {
  try {
    const record = await prisma.signupRecord.create({
      data: {
        userId,
        ipAddress: signupInfo.ipAddress,
        deviceFingerprint: signupInfo.deviceFingerprint,
        userAgent: signupInfo.userAgent,
        freeCreditGranted,
        isSuspicious,
        suspicionReason
      }
    });

    dbLogger.info('Signup record created', {
      userId,
      freeCreditGranted,
      isSuspicious
    });

    return record;
  } catch (error: any) {
    // Don't fail user creation if signup record fails
    dbLogger.error('Failed to create signup record', {
      userId,
      error: error.message
    });
    return null;
  }
}

/**
 * Get signup statistics for admin dashboard
 */
export async function getSignupStats() {
  const totalSignups = await prisma.signupRecord.count();
  const suspiciousSignups = await prisma.signupRecord.count({
    where: { isSuspicious: true }
  });
  const blockedFreeCredits = await prisma.signupRecord.count({
    where: {
      isSuspicious: true,
      freeCreditGranted: false
    }
  });

  // Get top IPs with multiple signups
  const suspiciousIPs = await prisma.signupRecord.groupBy({
    by: ['ipAddress'],
    where: {
      ipAddress: { not: null }
    },
    _count: { ipAddress: true },
    having: {
      ipAddress: { _count: { gt: 1 } }
    },
    orderBy: {
      _count: { ipAddress: 'desc' }
    },
    take: 10
  });

  return {
    totalSignups,
    suspiciousSignups,
    blockedFreeCredits,
    suspiciousIPs: suspiciousIPs.map(ip => ({
      ipPrefix: ip.ipAddress?.substring(0, 10) + '...',
      count: ip._count.ipAddress
    }))
  };
}

/**
 * Check if a specific user's signup was suspicious
 */
export async function getUserSignupRecord(userId: string) {
  return prisma.signupRecord.findUnique({
    where: { userId }
  });
}

/**
 * Mark a signup as reviewed (for admin use)
 */
export async function markSignupReviewed(
  userId: string,
  isSuspicious: boolean,
  reason?: string
) {
  return prisma.signupRecord.update({
    where: { userId },
    data: {
      isSuspicious,
      suspicionReason: reason
    }
  });
}
