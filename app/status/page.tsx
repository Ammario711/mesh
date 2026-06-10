import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppConfig } from "../../lib/mesh/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch Status",
  description: "Operational readiness and launch status for Mesh.",
};

export default function StatusPage() {
  const config = getPublicAppConfig();

  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <section className="mx-auto max-w-4xl rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-weld" href="/">
          Back to Mesh
        </Link>
        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Production readiness
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {config.ready ? "Ready for public RFQs" : "Setup needed"}
            </h1>
          </div>
          <span
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              config.ready
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {config.storage}
          </span>
        </div>

        <div className="mt-6 grid gap-3">
          {config.readiness.map((check) => (
            <article
              className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
              key={check.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-graphite">
                    {check.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {check.detail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    check.ok
                      ? "bg-emerald-100 text-emerald-800"
                      : check.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {check.ok ? "OK" : check.severity}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-md bg-zinc-900 p-5 text-sm leading-7 text-zinc-300">
          <p className="font-semibold text-white">Launch requirements</p>
          <p className="mt-2">
            Set `DATABASE_URL` and `NEXT_PUBLIC_MESH_SUPPORT_EMAIL` in Vercel,
            then redeploy. When those are configured, `/api/readiness` returns
            200 and Mesh accepts durable public RFQs and maker applications.
          </p>
        </div>
      </section>
    </main>
  );
}
