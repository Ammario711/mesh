import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicAppConfig,
  isPlaceholderSupportEmail,
} from "../../lib/mesh/config";

export const metadata: Metadata = {
  title: "Trust & Safety | Mesh",
  description: "Mesh trust, safety, CAD handling, and maker expectations.",
};

export default function TrustPage() {
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
          Trust & Safety
        </h1>

        <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-lg font-semibold text-graphite">CAD Handling</h2>
          <p>
            CAD files uploaded to Mesh are used to calculate quotes, store job
            records, and share RFQ details with selected makers. Users should
            only upload files they own or are authorized to manufacture.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Prohibited Jobs
          </h2>
          <p>
            Mesh should not be used for weapons, regulated parts, illegal
            goods, counterfeit components, unsafe pressure vessels, medical
            implants, or any job requiring certification that the selected maker
            cannot provide.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Maker Expectations
          </h2>
          <p>
            Makers are expected to describe their equipment accurately, reject
            jobs they cannot safely produce, protect confidential files, and
            communicate material, tolerance, and delivery constraints before
            accepting production work.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Reporting
          </h2>
          <p>
            Report unsafe jobs, IP concerns, or suspicious maker activity to{" "}
            {supportContact}. Mesh may remove listings, jobs, or accounts that
            create safety, legal, or trust risks.
          </p>
        </section>
      </article>
    </main>
  );
}
