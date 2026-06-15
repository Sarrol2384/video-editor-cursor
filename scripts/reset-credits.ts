import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, credits: true },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: 500 },
    });
    await prisma.creditLedger.create({
      data: {
        userId: user.id,
        delta: 500 - user.credits,
        balanceAfter: 500,
        reason: "Reset to 500 credits",
      },
    });
  }

  console.log("Credits reset to 500 for:", users);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
