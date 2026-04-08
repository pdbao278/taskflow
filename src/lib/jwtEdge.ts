import { jwtVerify } from "jose";

function getJwtSecretBytes() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyAuthTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const exp = typeof payload.exp === "number" ? payload.exp : null;

    if (!sub || !email || !exp) return null;

    return { sub, email, exp };
  } catch {
    return null;
  }
}

