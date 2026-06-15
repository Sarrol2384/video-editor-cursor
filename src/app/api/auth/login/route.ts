import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return jsonError("Email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return jsonError("Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return jsonError("Invalid email or password", 401);

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
    return jsonError("Login failed", 500);
  }
}
