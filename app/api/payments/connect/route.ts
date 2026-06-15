import { NextResponse } from "next/server";
import { createStripeConnectOnboarding } from "../../../../lib/mesh/payments";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import { getCurrentSession, requireRole } from "../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../lib/mesh/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = requireRole(await getCurrentSession(), [
      "maker",
      "admin",
    ]);
    const onboarding = await createStripeConnectOnboarding(session.email);
    const store = getMarketplaceStore();
    const user = await store.getUserByEmail(session.email);

    if (user) {
      await store.upsertUser({
        ...user,
        stripeAccountId: onboarding.accountId,
        stripeOnboardedAt: new Date().toISOString(),
      });
    }

    await recordAuditEvent({
      actorEmail: session.email,
      metadata: { accountId: onboarding.accountId },
      targetId: session.id,
      type: "payment.connect_onboarding_created",
    });

    return NextResponse.json(onboarding);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Connect onboarding.",
      },
      { status: statusForError(error, 503) },
    );
  }
}
