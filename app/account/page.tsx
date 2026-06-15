import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { StripeConnectButton } from "./StripeConnectButton";
import { getCurrentSession } from "../../lib/mesh/server-auth";
import { getMarketplaceStore } from "../../lib/mesh/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description: "Mesh account profile and role.",
};

export default async function AccountPage() {
  const session = await getCurrentSession();
  const user = session
    ? await getMarketplaceStore().getUserByEmail(session.email)
    : null;

  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <section className="mx-auto max-w-2xl rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-weld" href="/">
          Back to Mesh
        </Link>
        <p className="mt-8 text-sm font-medium text-zinc-500">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          {session ? session.name : "Not logged in"}
        </h1>
        {session ? (
          <div className="mt-6 grid gap-3 text-sm">
            <Info label="Email" value={session.email} />
            <Info label="Role" value={session.role} />
            {(session.role === "maker" || session.role === "admin") && (
              <div className="rounded-md bg-zinc-50 p-4 ring-1 ring-zinc-200">
                <p className="text-xs font-medium text-zinc-500">Payouts</p>
                <p className="mt-1 text-sm font-semibold text-graphite">
                  {user?.stripeAccountId
                    ? "Stripe Connect account linked"
                    : "Stripe Connect not linked"}
                </p>
                {!user?.stripeAccountId && (
                  <div className="mt-3">
                    <StripeConnectButton />
                  </div>
                )}
              </div>
            )}
            <LogoutButton />
          </div>
        ) : (
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-md bg-graphite px-4 text-sm font-semibold text-white"
            href="/login"
          >
            Log in
          </Link>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-graphite">{value}</p>
    </div>
  );
}
