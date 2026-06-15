import { cookies } from "next/headers";
import {
  createSessionToken,
  getSessionMaxAgeSeconds,
  parseSessionToken,
  sessionCookieName,
  type SessionClaims,
} from "./auth";
import type { UserAccount, UserRole } from "./domain";

export async function getCurrentSession() {
  const cookieStore = await cookies();

  return parseSessionToken(cookieStore.get(sessionCookieName)?.value);
}

export async function setSessionCookie(user: UserAccount) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    maxAge: getSessionMaxAgeSeconds(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function requireRole(
  session: SessionClaims | null,
  roles: UserRole[],
) {
  if (!session || !roles.includes(session.role)) {
    throw new Error("Unauthorized");
  }

  return session;
}
