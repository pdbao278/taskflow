import { cookies } from "next/headers";
import { verifyAuthToken } from "./jwt";
import { getPrisma } from "./prisma";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = verifyAuthToken(token);
  
  if (!payload) {
    return null;
  }
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true },
  });
  
  return user;
}
