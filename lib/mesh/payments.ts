import { createId } from "./auth";
import type { JobSubmission, PaymentRecord } from "./domain";

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createStripeCheckoutSession(job: JobSubmission) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for payments.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://mesh-marketplace-mvp.vercel.app";
  const body = new URLSearchParams({
    cancel_url: `${appUrl}/account`,
    "line_items[0][price_data][currency]": "cad",
    "line_items[0][price_data][product_data][name]": `Mesh RFQ: ${job.projectName}`,
    "line_items[0][price_data][unit_amount]": String(Math.round(job.price * 100)),
    "line_items[0][quantity]": "1",
    "metadata[jobId]": job.id,
    mode: "payment",
    success_url: `${appUrl}/account?checkout=success`,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    body,
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    id?: string;
    url?: string;
  };

  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(payload.error?.message ?? "Stripe checkout failed.");
  }

  return payload;
}

export async function createStripeConnectOnboarding(email: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for payouts.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://mesh-marketplace-mvp.vercel.app";
  const accountResponse = await fetch("https://api.stripe.com/v1/accounts", {
    body: new URLSearchParams({
      country: "CA",
      email,
      type: "express",
    }),
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const account = (await accountResponse.json()) as {
    error?: { message?: string };
    id?: string;
  };

  if (!accountResponse.ok || !account.id) {
    throw new Error(account.error?.message ?? "Stripe account creation failed.");
  }

  const linkResponse = await fetch("https://api.stripe.com/v1/account_links", {
    body: new URLSearchParams({
      account: account.id,
      refresh_url: `${appUrl}/account?connect=refresh`,
      return_url: `${appUrl}/account?connect=success`,
      type: "account_onboarding",
    }),
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const link = (await linkResponse.json()) as {
    error?: { message?: string };
    url?: string;
  };

  if (!linkResponse.ok || !link.url) {
    throw new Error(link.error?.message ?? "Stripe onboarding failed.");
  }

  return { accountId: account.id, url: link.url };
}

export function createPaymentRecord(
  job: JobSubmission,
  session: { id?: string; url?: string },
): PaymentRecord {
  return {
    amount: job.price,
    checkoutUrl: session.url,
    createdAt: new Date().toISOString(),
    currency: "cad",
    id: createId("payment"),
    jobId: job.id,
    provider: "stripe",
    providerSessionId: session.id,
    status: session.id ? "Checkout Created" : "Pending",
  };
}
