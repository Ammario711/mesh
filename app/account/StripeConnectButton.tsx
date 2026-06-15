"use client";

import { useState } from "react";

export function StripeConnectButton() {
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function startOnboarding() {
    setIsWorking(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/connect", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Could not start payout onboarding.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start payout onboarding.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div>
      <button
        className="inline-flex h-10 items-center rounded-md bg-weld px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        disabled={isWorking}
        onClick={() => void startOnboarding()}
        type="button"
      >
        {isWorking ? "Opening Stripe..." : "Set up payouts"}
      </button>
      {message && <p className="mt-2 text-sm font-semibold text-red-700">{message}</p>}
    </div>
  );
}
