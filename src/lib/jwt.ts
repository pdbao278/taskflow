import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signAuthToken(user: Pick<User, "id" | "email">) {
  const payload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRY_SECONDS,
  });
}

export function verifyAuthToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as {
      sub: string;
      email: string;
      exp: number;
    };
  } catch {
    return null;
  }
}

