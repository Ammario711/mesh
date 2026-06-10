import type { Metadata } from "next";
import Link from "next/link";
import { MakerApplicationForm } from "./MakerApplicationForm";

export const metadata: Metadata = {
  title: "Apply as a Maker",
  description:
    "Apply to join Mesh as a local 3D printing, CNC, or fabrication operator.",
};

export default function MakersPage() {
  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
        <aside className="rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
          <Link className="text-sm font-semibold text-weld" href="/">
            Back to Mesh
          </Link>
          <p className="mt-8 text-sm font-medium text-zinc-500">
            Maker network
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Add your shop capacity to Mesh.
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            Mesh routes student and startup CAD jobs to local operators. Apply
            with your equipment profile, material support, lead times, and
            service area so future RFQs can match to your capabilities.
          </p>

          <div className="mt-6 space-y-3 text-sm text-zinc-700">
            <ChecklistItem text="3D printing, CNC, laser, or finishing capacity" />
            <ChecklistItem text="Clear material and tolerance capabilities" />
            <ChecklistItem text="Local pickup or courier handoff" />
            <ChecklistItem text="Willingness to review CAD files before acceptance" />
          </div>
        </aside>

        <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
          <p className="text-sm font-medium text-zinc-500">
            Operator application
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            Shop profile
          </h2>
          <MakerApplicationForm />
        </section>
      </section>
    </main>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-weld" />
      <span>{text}</span>
    </div>
  );
}
