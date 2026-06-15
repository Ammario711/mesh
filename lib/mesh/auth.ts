import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthChallenge, UserAccount, UserRole } from "./domain";
import { getMarketplaceStore } from "./store";

export const sessionCookieName = "mesh_session";

export type SessionClaims = {
  email: string;
  exp: number;
  id: string;
  name: string;
  role: UserRole;
};

const sessionMaxAgeSeconds = 60 * 60 * 24 * 14;
const challengeTtlMs = 1000 * 60 * 10;

export function createId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function createLoginCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashSecret(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function verifyHash(value: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(user: UserAccount) {
  const claims: SessionClaims = {
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds,
    id: user.id,
    name: user.name,
    role: user.role,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || signature !== signPayload(payload)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionClaims;

    if (!claims.email || claims.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export async function createAuthChallenge({
  email,
  role,
}: {
  email: string;
  role: UserRole;
}) {
  const code = createLoginCode();
  const now = new Date();
  const challenge: AuthChallenge = {
    codeHash: hashSecret(code),
    createdAt: now.toISOString(),
    email: normalizeEmail(email),
    expiresAt: new Date(now.getTime() + challengeTtlMs).toISOString(),
    id: createId("challenge"),
    purpose: "login",
    role,
  };

  await getMarketplaceStore().createAuthChallenge(challenge);

  return { challenge, code };
}

export async function verifyAuthChallenge({
  challengeId,
  code,
  name,
  organization,
}: {
  challengeId: string;
  code: string;
  name: string;
  organization: string;
}) {
  const store = getMarketplaceStore();
  const challenge = await store.getAuthChallenge(challengeId);

  if (!challenge || challenge.usedAt) {
    throw new Error("That login code is no longer valid.");
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error("That login code has expired.");
  }

  if (!verifyHash(code.trim(), challenge.codeHash)) {
    throw new Error("That login code is incorrect.");
  }

  const existingUser = await store.getUserByEmail(challenge.email);
  const now = new Date().toISOString();
  const user: UserAccount = {
    id: existingUser?.id ?? createId("user"),
    email: challenge.email,
    name: name.trim() || existingUser?.name || challenge.email.split("@")[0],
    organization: organization.trim() || existingUser?.organization || "",
    role: resolveRole(challenge.email, challenge.role),
    createdAt: existingUser?.createdAt ?? now,
    lastLoginAt: now,
  };

  await store.upsertUser(user);
  await store.updateAuthChallenge({ ...challenge, usedAt: now });

  return user;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isAdminEmail(email: string) {
  const admins = (process.env.MESH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(normalizeEmail(email));
}

export function getSessionMaxAgeSeconds() {
  return sessionMaxAgeSeconds;
}

function resolveRole(email: string, requestedRole: UserRole): UserRole {
  if (isAdminEmail(email)) {
    return "admin";
  }

  return requestedRole === "admin" ? "buyer" : requestedRole;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "mesh-development-secret-change-before-production"
  );
}
