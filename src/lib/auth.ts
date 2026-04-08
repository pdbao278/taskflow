import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { getPrisma } from "./prisma";

export function hashPassword(password: string) {
  const saltRounds = Math.max(12, Number(process.env.BCRYPT_COST || 12));
  return bcrypt.hash(password, saltRounds);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type FindUserByEmailOptions =
  | { forAuth?: false | undefined }
  | { forAuth: true };

export async function findUserByEmail(email: string, options?: FindUserByEmailOptions) {
  const forAuth = options?.forAuth ?? false;

  // Default to a "public" projection so API responses don't accidentally leak secrets.
  if (!forAuth) {
    return getPrisma().user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
  }

  // Only the login flow should request auth fields.
  return getPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password_hash: true,
      failed_login_attempts: true,
      locked_until: true,
    } as any,
  }) as unknown as User | null;
}


