"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#eef1f4] px-5 text-graphite">
          <section className="max-w-lg rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
            <p className="text-sm font-semibold text-weld">Mesh</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              Something went wrong.
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              The error has been captured for review. You can retry the page or
              return to the dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex h-10 items-center rounded-md bg-graphite px-4 text-sm font-semibold text-white"
                onClick={() => reset()}
                type="button"
              >
                Try again
              </button>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-graphite"
                href="/"
              >
                Back to Mesh
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
