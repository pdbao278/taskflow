import { cookies } from "next/headers";
import { verifyAuthToken } from "./jwt";

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
  
  return {
    id: payload.sub,
    email: payload.email,
  };
}
