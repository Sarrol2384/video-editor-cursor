import { prisma } from "./db";

/**
 * When false, generation skips Studio credit deduction (SKIP_APP_CREDITS=true only).
 */
export function isAppCreditGateEnabled(): boolean {
  return process.env.SKIP_APP_CREDITS !== "true";
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

export async function reserveCredits(
  userId: string,
  amount: number,
  reason: string,
  jobId?: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  if (!isAppCreditGateEnabled()) {
    const balance = await getUserCredits(userId);
    return { success: true, balance };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, balance: 0, error: "User not found" };
  if (user.credits < amount) {
    return {
      success: false,
      balance: user.credits,
      error: `Insufficient credits. Need ${amount}, have ${user.credits}.`,
    };
  }

  const newBalance = user.credits - amount;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        jobId,
        delta: -amount,
        balanceAfter: newBalance,
        reason: `Reserved: ${reason}`,
      },
    }),
  ]);

  return { success: true, balance: newBalance };
}

export async function finalizeCredits(
  userId: string,
  reservedAmount: number,
  actualAmount: number,
  reason: string,
  jobId?: string
): Promise<number> {
  if (!isAppCreditGateEnabled()) return getUserCredits(userId);

  const refund = reservedAmount - actualAmount;
  if (refund <= 0) return await getUserCredits(userId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const newBalance = user.credits + refund;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        jobId,
        delta: refund,
        balanceAfter: newBalance,
        reason: `Adjustment: ${reason}`,
      },
    }),
  ]);

  return newBalance;
}

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  jobId?: string
): Promise<number> {
  if (!isAppCreditGateEnabled()) return getUserCredits(userId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const newBalance = user.credits + amount;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        jobId,
        delta: amount,
        balanceAfter: newBalance,
        reason: `Refund: ${reason}`,
      },
    }),
  ]);

  return newBalance;
}
