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
const defaultAuthSecret = "mesh-development-secret-change-before-production";
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
  const legalReviewedAt = process.env.MESH_LEGAL_REVIEWED_AT ?? "";
  const legalReviewer = process.env.MESH_LEGAL_REVIEWER ?? "";
  const storage = hasDatabaseUrl() ? "postgres" : "file";
  const readiness = buildReadinessChecks({
    appUrl,
    isProduction,
    legalReviewedAt,
    legalReviewer,
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
  legalReviewedAt,
  legalReviewer,
  storage,
  supportEmail,
}: {
  appUrl: string;
  isProduction: boolean;
  legalReviewedAt: string;
  legalReviewer: string;
  storage: "file" | "postgres";
  supportEmail: string;
}): ReadinessCheck[] {
  const authSecret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const adminEmails = (process.env.MESH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const hasEmailProvider = Boolean(process.env.RESEND_API_KEY);
  const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasStripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const hasSentryDsn = Boolean(
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  );
  const hasLegalReview = Boolean(legalReviewedAt && legalReviewer);
  const productionSeverity = isProduction ? "critical" : "warning";

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
        ? "Set NEXT_PUBLIC_MESH_SUPPORT_EMAIL or MESH_SUPPORT_EMAIL to a monitored support inbox."
        : "Support contact is configured.",
      key: "support-contact",
      ok: !isPlaceholderSupportEmail(supportEmail),
      severity: isProduction ? "critical" : "warning",
      title: "Support contact",
    },
    {
      detail:
        authSecret && authSecret !== defaultAuthSecret
          ? "Signed session cookies use a production secret."
          : "Set AUTH_SECRET to a long random value before enabling accounts.",
      key: "auth-secret",
      ok: Boolean(authSecret && authSecret !== defaultAuthSecret),
      severity: productionSeverity,
      title: "Auth secret",
    },
    {
      detail:
        adminEmails.length > 0
          ? `${adminEmails.length} admin email${adminEmails.length === 1 ? "" : "s"} configured.`
          : "Set MESH_ADMIN_EMAILS so operational tools are not open-ended.",
      key: "admin-accounts",
      ok: adminEmails.length > 0,
      severity: productionSeverity,
      title: "Admin accounts",
    },
    {
      detail: hasEmailProvider
        ? "Transactional email provider is configured."
        : "Set RESEND_API_KEY and MESH_EMAIL_FROM so login codes and workflow notices are delivered.",
      key: "email-provider",
      ok: hasEmailProvider,
      severity: productionSeverity,
      title: "Email provider",
    },
    {
      detail: hasStripeSecret
        ? "Stripe API access is configured for checkout and Connect onboarding."
        : "Set STRIPE_SECRET_KEY before accepting paid jobs or onboarding makers for payouts.",
      key: "payments",
      ok: hasStripeSecret,
      severity: productionSeverity,
      title: "Payments and payouts",
    },
    {
      detail: hasStripeWebhook
        ? "Stripe webhook signature verification is configured."
        : "Set STRIPE_WEBHOOK_SECRET so completed checkout sessions update Mesh payments.",
      key: "payment-webhooks",
      ok: hasStripeWebhook,
      severity: productionSeverity,
      title: "Payment webhooks",
    },
    {
      detail: hasSentryDsn
        ? "Sentry DSN is configured for production error tracking."
        : "Set SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN for runtime error tracking.",
      key: "observability",
      ok: hasSentryDsn,
      severity: productionSeverity,
      title: "Observability",
    },
    {
      detail: hasLegalReview
        ? `Legal review recorded by ${legalReviewer} on ${legalReviewedAt}.`
        : "Set MESH_LEGAL_REVIEWER and MESH_LEGAL_REVIEWED_AT after counsel reviews terms, privacy, and operating policies.",
      key: "legal-review",
      ok: hasLegalReview,
      severity: productionSeverity,
      title: "Legal review",
    },
    {
      detail: "Terms, privacy, and trust pages are available.",
      key: "legal-pages",
      ok: true,
      severity: "info",
      title: "Legal pages",
    },
    {
      detail: "Rate limits, a maker-application honeypot, and production storage guards are enabled in write routes.",
      key: "abuse-protection",
      ok: true,
      severity: "info",
      title: "Abuse protection",
    },
  ];
}
