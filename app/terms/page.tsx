import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicAppConfig,
  isPlaceholderSupportEmail,
} from "../../lib/mesh/config";

export const metadata: Metadata = {
  title: "Terms of Service | Mesh",
  description: "Terms for using Mesh to request and coordinate local fabrication.",
};

export default function TermsPage() {
  const config = getPublicAppConfig();
  const supportContact = isPlaceholderSupportEmail(config.supportEmail)
    ? "the Mesh operator"
    : config.supportEmail;

  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <article className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-weld" href="/">
          Back to Mesh
        </Link>
        <p className="mt-8 text-sm font-medium text-zinc-500">
          Effective {config.legalEffectiveDate}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Terms of Service
        </h1>

        <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-lg font-semibold text-graphite">Use of Mesh</h2>
          <p>
            Mesh helps users request local manufacturing quotes and coordinate
            RFQs with 3D printer and CNC operators. Users are responsible for
            the accuracy, legality, safety, and manufacturability of submitted
            designs.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Quotes and Jobs
          </h2>
          <p>
            Instant quotes are estimates based on uploaded geometry, selected
            material, infill, finish, tolerance, urgency, and quantity. Final
            pricing, lead time, and feasibility may change after maker review.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            CAD Rights
          </h2>
          <p>
            By uploading a CAD file, the user confirms they have the rights
            needed to quote and manufacture the part. Mesh does not receive
            ownership of uploaded designs.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Payments
          </h2>
          <p>
            Mesh currently records RFQs and quote requests. Payment, refunds,
            taxes, disputes, and maker payouts must be handled under the payment
            process presented at the time a paid order is introduced.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Prohibited Work
          </h2>
          <p>
            Mesh may reject or remove jobs involving illegal products, weapons,
            counterfeit goods, unsafe regulated parts, or designs that violate
            another party&apos;s rights.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">Contact</h2>
          <p>
            Questions about these terms can be sent to {supportContact}. Mesh
            may update these terms as the service adds accounts, payments, and
            additional marketplace workflows.
          </p>
        </section>
      </article>
    </main>
  );
}
