import { hasDatabaseUrl } from "./postgres";

export type ReadinessSeverity = "critical" | "warning" | "info";

export type ReadinessCheck = {
  detail: string;
  key: string;
  ok: boolean;
  severity: ReadinessSeverity;
  title: string;
};

export type PublicAppConfig = {
  appUrl: string;
  isProduction: boolean;
  legalEffectiveDate: string;
  ready: boolean;
  readiness: ReadinessCheck[];
  storage: "file" | "postgres";
  supportEmail: string;
};

const defaultAppUrl = "https://mesh-marketplace-mvp.vercel.app";
const defaultSupportEmail = "support@mesh.local";
const defaultLegalEffectiveDate = "June 10, 2026";

export function getPublicAppConfig(): PublicAppConfig {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : defaultAppUrl);
  const supportEmail =
    process.env.NEXT_PUBLIC_MESH_SUPPORT_EMAIL ??
    process.env.MESH_SUPPORT_EMAIL ??
    defaultSupportEmail;
  const storage = hasDatabaseUrl() ? "postgres" : "file";
  const readiness = buildReadinessChecks({
    appUrl,
    isProduction,
    storage,
    supportEmail,
  });

  return {
    appUrl,
    isProduction,
    legalEffectiveDate:
      process.env.NEXT_PUBLIC_MESH_LEGAL_EFFECTIVE_DATE ??
      process.env.MESH_LEGAL_EFFECTIVE_DATE ??
      defaultLegalEffectiveDate,
    ready: readiness.every(
      (check) => check.ok || check.severity !== "critical",
    ),
    readiness,
    storage,
    supportEmail,
  };
}

export function isPlaceholderSupportEmail(email: string) {
  return email.endsWith(".local") || email.endsWith("@example.com");
}

export function shouldRejectEphemeralWrites() {
  const config = getPublicAppConfig();

  return (
    config.isProduction &&
    config.storage === "file" &&
    process.env.MESH_ALLOW_EPHEMERAL_WRITES !== "true"
  );
}

export function ephemeralWriteError() {
  return new Error(
    "Production storage is not configured. Set DATABASE_URL to enable durable RFQs and CAD uploads.",
  );
}

function buildReadinessChecks({
  appUrl,
  isProduction,
  storage,
  supportEmail,
}: {
  appUrl: string;
  isProduction: boolean;
  storage: "file" | "postgres";
  supportEmail: string;
}): ReadinessCheck[] {
  return [
    {
      detail:
        storage === "postgres"
          ? "Postgres is configured for durable files, RFQs, and jobs."
          : "Set DATABASE_URL before using Mesh for real RFQs in production.",
      key: "durable-storage",
      ok: storage === "postgres" || !isProduction,
      severity: isProduction ? "critical" : "warning",
      title: "Durable storage",
    },
    {
      detail: appUrl.startsWith("https://")
        ? "Canonical app URL is HTTPS."
        : "Set NEXT_PUBLIC_APP_URL to the public HTTPS URL.",
      key: "canonical-url",
      ok: appUrl.startsWith("https://"),
      severity: "warning",
      title: "Canonical URL",
    },
    {
      detail: isPlaceholderSupportEmail(supportEmail)
        ? "Set NEXT_PUBLIC_MESH_SUPPORT_EMAIL to a monitored inbox."
        : "Support contact is configured.",
      key: "support-contact",
      ok: !isPlaceholderSupportEmail(supportEmail),
      severity: isProduction ? "critical" : "warning",
      title: "Support contact",
    },
    {
      detail: "Terms, privacy, and trust pages are available.",
      key: "legal-pages",
      ok: true,
      severity: "info",
      title: "Legal pages",
    },
  ];
}
