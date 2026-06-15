import * as Sentry from "@sentry/nextjs";
import type { AuditEvent } from "./domain";
import { createId } from "./auth";
import { getMarketplaceStore } from "./store";

export async function recordAuditEvent(
  event: Omit<AuditEvent, "createdAt" | "id"> & { id?: string },
) {
  const auditEvent: AuditEvent = {
    createdAt: new Date().toISOString(),
    id: event.id ?? createId("audit"),
    metadata: event.metadata,
    targetId: event.targetId,
    type: event.type,
    actorEmail: event.actorEmail,
  };

  try {
    await getMarketplaceStore().createAuditEvent(auditEvent);
  } catch (error) {
    console.error("Mesh audit persistence failed", error);
  }

  return auditEvent;
}

export async function captureError(
  error: unknown,
  context: {
    actorEmail?: string;
    metadata?: Record<string, string | number | boolean | null>;
    route?: string;
  } = {},
) {
  const message = error instanceof Error ? error.message : "Unknown error";

  console.error("Mesh error", {
    message,
    route: context.route,
    metadata: context.metadata,
  });
  Sentry.captureException(
    error instanceof Error ? error : new Error(message),
    {
      extra: {
        route: context.route,
        ...(context.metadata ?? {}),
      },
      user: context.actorEmail ? { email: context.actorEmail } : undefined,
    },
  );

  await recordAuditEvent({
    actorEmail: context.actorEmail,
    metadata: {
      message,
      route: context.route ?? null,
      ...(context.metadata ?? {}),
    },
    type: "error.captured",
  });
}
