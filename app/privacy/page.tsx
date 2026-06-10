import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicAppConfig,
  isPlaceholderSupportEmail,
} from "../../lib/mesh/config";

export const metadata: Metadata = {
  title: "Privacy Policy | Mesh",
  description: "How Mesh handles CAD files, RFQs, job records, and local data.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-lg font-semibold text-graphite">
            Information Mesh Handles
          </h2>
          <p>
            Mesh stores CAD metadata, uploaded CAD files, quote selections, RFQ
            notes, maker matches, and sent job records. The browser may also
            keep recent files and jobs in localStorage for continuity on the
            same device.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            How Information Is Used
          </h2>
          <p>
            Information is used to calculate quotes, match local makers,
            maintain job history, troubleshoot the service, and communicate
            about requested manufacturing work.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            CAD Confidentiality
          </h2>
          <p>
            CAD files may contain sensitive designs. Mesh should only share job
            files with makers selected for an RFQ or with service providers
            needed to operate the platform.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">
            Retention
          </h2>
          <p>
            Mesh retains uploaded files and job records while needed for quotes,
            support, safety, legal compliance, and marketplace operations.
            Browser localStorage can be cleared from the user&apos;s browser at
            any time.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-graphite">Contact</h2>
          <p>
            Privacy and data requests can be sent to {supportContact}. Requests
            may require verification before records are changed or deleted.
          </p>
        </section>
      </article>
    </main>
  );
}
