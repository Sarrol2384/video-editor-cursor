import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return jsonError("Email and password are required");
    }
    if (password.length < 6) {
      return jsonError("Password must be at least 6 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        credits: 100,
      },
    });

    await prisma.creditLedger.create({
      data: {
        userId: user.id,
        delta: 100,
        balanceAfter: 100,
        reason: "Welcome bonus",
      },
    });

    await createSession(user.id);

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
      },
    });
  } catch {
    return jsonError("Registration failed", 500);
  }
}
