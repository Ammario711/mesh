import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  JobStatusActions,
  MakerApplicationActions,
} from "./AdminActions";
import { getMarketplaceStore } from "../../lib/mesh/store";
import { getCurrentSession, requireRole } from "../../lib/mesh/server-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Mesh admin dashboard.",
};

export default async function AdminPage() {
  const session = await getCurrentSession();

  try {
    requireRole(session, ["admin"]);
  } catch {
    return (
      <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
        <section className="mx-auto max-w-xl rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
          <Link className="text-sm font-semibold text-weld" href="/">
            Back to Mesh
          </Link>
          <h1 className="mt-8 text-3xl font-semibold tracking-normal">
            Admin access required
          </h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Log in with an email listed in `MESH_ADMIN_EMAILS`.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md bg-graphite px-4 text-sm font-semibold text-white"
            href="/login"
          >
            Admin login
          </Link>
        </section>
      </main>
    );
  }

  const store = getMarketplaceStore();
  const [jobs, makerApplications, payments, auditEvents] = await Promise.all([
    store.listJobs(),
    store.listMakerApplications(),
    store.listPayments(),
    store.listAuditEvents(),
  ]);

  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
          <Link className="text-sm font-semibold text-weld" href="/">
            Back to Mesh
          </Link>
          <p className="mt-8 text-sm font-medium text-zinc-500">
            Admin dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Marketplace operations
          </h1>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="Jobs" value={jobs.length} />
            <Metric label="Maker applications" value={makerApplications.length} />
            <Metric label="Payments" value={payments.length} />
            <Metric label="Audit events" value={auditEvents.length} />
          </div>
        </div>

        <Panel title="Maker Applications">
          {makerApplications.length === 0 ? (
            <Empty text="No maker applications yet." />
          ) : (
            makerApplications.slice(0, 12).map((application) => (
              <article className="rounded-md border border-zinc-200 p-4" key={application.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{application.shopName}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {application.email} / {application.city || "No city"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-zinc-500">
                      {application.processes.join(", ") || "No processes"} /{" "}
                      {application.materials.join(", ") || "No materials"}
                    </p>
                  </div>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold">
                    {application.status}
                  </span>
                </div>
                <MakerApplicationActions
                  id={application.id}
                  status={application.status}
                />
              </article>
            ))
          )}
        </Panel>

        <Panel title="Recent Jobs">
          {jobs.length === 0 ? (
            <Empty text="No jobs yet." />
          ) : (
            jobs.slice(0, 12).map((job) => (
              <article className="rounded-md border border-zinc-200 p-4" key={job.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{job.projectName}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {job.makerName} / {job.fileName}
                    </p>
                  </div>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold">
                    {job.status}
                  </span>
                </div>
                <JobStatusActions id={job.id} status={job.status} />
              </article>
            ))
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Payments">
            {payments.length === 0 ? (
              <Empty text="No payments yet." />
            ) : (
              payments.slice(0, 8).map((payment) => (
                <article
                  className="rounded-md border border-zinc-200 p-4"
                  key={payment.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{payment.jobId}</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {payment.provider} / {payment.currency.toUpperCase()}{" "}
                        {payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold">
                      {payment.status}
                    </span>
                  </div>
                </article>
              ))
            )}
          </Panel>

          <Panel title="Audit Log">
            {auditEvents.length === 0 ? (
              <Empty text="No audit events yet." />
            ) : (
              auditEvents.slice(0, 8).map((event) => (
                <article
                  className="rounded-md border border-zinc-200 p-4"
                  key={event.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{event.type}</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {event.actorEmail ?? "system"}
                      </p>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
      <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-zinc-600">{text}</p>;
}
