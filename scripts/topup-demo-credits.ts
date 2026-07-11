import { PrismaClient } from "@prisma/client";

const TARGET_CREDITS = 500;
const DEMO_EMAIL = "demo@example.com";

async function main() {
  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({
    select: { id: true, email: true, credits: true, name: true },
  });

  if (users.length === 0) {
    console.log("No users found. Run: npm run seed");
    return;
  }

  const target =
    users.find((u) => u.email === DEMO_EMAIL) ??
    users.sort((a, b) => b.credits - a.credits)[0];

  const previous = target.credits;
  const delta = TARGET_CREDITS - previous;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { credits: TARGET_CREDITS },
    }),
    prisma.creditLedger.create({
      data: {
        userId: target.id,
        delta,
        balanceAfter: TARGET_CREDITS,
        reason: "Manual demo top-up to 500",
      },
    }),
  ]);

  console.log(
    `Updated ${target.email} (${target.name || "no name"}): ${previous} → ${TARGET_CREDITS} credits`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
