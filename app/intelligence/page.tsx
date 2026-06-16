"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  Brain,
  CheckCircle2,
  Clock3,
  Factory,
  Gauge,
  Layers,
  LineChart,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  calculateQuote,
  finishOptions,
  infillOptions,
  materialOptions,
  toleranceOptions,
  urgencyOptions,
  type FinishKey,
  type InfillKey,
  type MaterialKey,
  type ParsedCadFile,
  type QuoteSpec,
  type ToleranceKey,
  type UrgencyKey,
} from "../../lib/mesh/domain";
import {
  analyzeManufacturability,
  buildMakerBidStack,
  type DfmReport,
  type MakerBid,
} from "../../lib/mesh/intelligence";

const partProfiles = [
  {
    dimensions: "60 x 34 x 18 mm",
    id: "bracket",
    name: "Mounting bracket",
    note: "Watertight STL volume computed from mesh triangles.",
    size: "42.8 KB",
    sizeBytes: 43800,
    source: "Exact STL mesh",
    tolerance: "+/- 0.18 mm",
    triangleCount: 148,
    type: "STL",
    uploadedAt: "2026-06-16T12:00:00.000Z",
    volume: 36.72,
  },
  {
    dimensions: "310 x 24 x 18 mm",
    id: "rail",
    name: "Linear rail spacer",
    note: "Long, thin STL used to stress-test warping and build-volume heuristics.",
    size: "118.4 KB",
    sizeBytes: 121242,
    source: "Exact STL mesh",
    tolerance: "+/- 0.18 mm",
    triangleCount: 412,
    type: "STL",
    uploadedAt: "2026-06-16T12:00:00.000Z",
    volume: 22.1,
  },
  {
    dimensions: "92 x 58 x 36 mm",
    id: "housing",
    name: "IoT enclosure STEP",
    note: "STEP files need CAD-kernel extraction; Mesh is using topology and size heuristics.",
    size: "1.6 MB",
    sizeBytes: 1677721,
    source: "STEP estimate",
    tolerance: "+/- 0.30 mm",
    triangleCount: null,
    type: "STEP",
    uploadedAt: "2026-06-16T12:00:00.000Z",
    volume: 81.4,
  },
] satisfies ParsedCadFile[];

const defaultSpec: QuoteSpec = {
  finish: "Standard",
  infill: "20%",
  material: "PLA",
  quantity: 4,
  toleranceTarget: "Standard",
  urgency: "Standard",
};

export default function MeshIntelligencePage() {
  const [activePartId, setActivePartId] = useState(partProfiles[0].id);
  const [material, setMaterial] = useState<MaterialKey>(defaultSpec.material);
  const [infill, setInfill] = useState<InfillKey>(defaultSpec.infill);
  const [finish, setFinish] = useState<FinishKey>(defaultSpec.finish);
  const [toleranceTarget, setToleranceTarget] = useState<ToleranceKey>(
    defaultSpec.toleranceTarget,
  );
  const [urgency, setUrgency] = useState<UrgencyKey>(defaultSpec.urgency);
  const [quantity, setQuantity] = useState(defaultSpec.quantity);

  const file = useMemo(
    () => partProfiles.find((part) => part.id === activePartId) ?? partProfiles[0],
    [activePartId],
  );
  const spec = useMemo<QuoteSpec>(
    () => ({ finish, infill, material, quantity, toleranceTarget, urgency }),
    [finish, infill, material, quantity, toleranceTarget, urgency],
  );
  const quote = useMemo(() => calculateQuote(file, spec), [file, spec]);
  const dfm = useMemo(
    () => analyzeManufacturability(file, spec, quote),
    [file, quote, spec],
  );
  const bids = useMemo(() => buildMakerBidStack(file, spec), [file, spec]);

  return (
    <main className="min-h-screen bg-[#eef1f4] text-graphite">
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
            <Link className="text-sm font-semibold text-weld" href="/">
              Back to Mesh
            </Link>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-zinc-900 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">Mesh Intelligence</p>
                <h1 className="text-2xl font-semibold tracking-normal">
                  CAD decision cockpit
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Analyze manufacturability, quote confidence, production risk, and
              maker bids before a job ever reaches an operator queue.
            </p>
          </div>

          <ControlPanel
            activePartId={activePartId}
            finish={finish}
            infill={infill}
            material={material}
            quantity={quantity}
            setActivePartId={setActivePartId}
            setFinish={setFinish}
            setInfill={setInfill}
            setMaterial={setMaterial}
            setQuantity={setQuantity}
            setToleranceTarget={setToleranceTarget}
            setUrgency={setUrgency}
            toleranceTarget={toleranceTarget}
            urgency={urgency}
          />
        </aside>

        <section className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-4">
            <ScoreCard
              icon={ShieldCheck}
              label="DFM score"
              tone={dfm.manufacturabilityScore >= 82 ? "good" : "warn"}
              value={`${dfm.manufacturabilityScore}%`}
            />
            <ScoreCard
              icon={LineChart}
              label="Quote confidence"
              tone={dfm.confidence >= 80 ? "good" : "warn"}
              value={`${dfm.confidence}%`}
            />
            <ScoreCard
              icon={Clock3}
              label="Review estimate"
              tone="neutral"
              value={`${dfm.estimatedReviewMinutes} min`}
            />
            <ScoreCard
              icon={Gauge}
              label="Estimated total"
              tone="neutral"
              value={`$${quote.price.toFixed(2)}`}
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <DfmReportPanel dfm={dfm} file={file} />
            <QuoteStack file={file} quotePrice={quote.price} spec={spec} />
          </section>

          <MakerBidPanel bids={bids} />
        </section>
      </section>
    </main>
  );
}

function ControlPanel({
  activePartId,
  finish,
  infill,
  material,
  quantity,
  setActivePartId,
  setFinish,
  setInfill,
  setMaterial,
  setQuantity,
  setToleranceTarget,
  setUrgency,
  toleranceTarget,
  urgency,
}: {
  activePartId: string;
  finish: FinishKey;
  infill: InfillKey;
  material: MaterialKey;
  quantity: number;
  setActivePartId: (value: string) => void;
  setFinish: (value: FinishKey) => void;
  setInfill: (value: InfillKey) => void;
  setMaterial: (value: MaterialKey) => void;
  setQuantity: (value: number) => void;
  setToleranceTarget: (value: ToleranceKey) => void;
  setUrgency: (value: UrgencyKey) => void;
  toleranceTarget: ToleranceKey;
  urgency: UrgencyKey;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Scenario controls</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            Run the job before it runs
          </h2>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mt-5 space-y-4">
        <SelectField
          label="Part profile"
          value={activePartId}
          onChange={setActivePartId}
          options={partProfiles.map((part) => ({ label: part.name, value: part.id }))}
        />
        <SelectField
          label="Material"
          value={material}
          onChange={(value) => setMaterial(value as MaterialKey)}
          options={materialOptions.map((option) => ({
            label: option.name,
            value: option.name,
          }))}
        />
        <SelectField
          label="Infill"
          value={infill}
          onChange={(value) => setInfill(value as InfillKey)}
          options={infillOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
        />
        <SelectField
          label="Finish"
          value={finish}
          onChange={(value) => setFinish(value as FinishKey)}
          options={finishOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
        />
        <SelectField
          label="Tolerance"
          value={toleranceTarget}
          onChange={(value) => setToleranceTarget(value as ToleranceKey)}
          options={toleranceOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
        />
        <SelectField
          label="Timeline"
          value={urgency}
          onChange={(value) => setUrgency(value as UrgencyKey)}
          options={urgencyOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
        />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-graphite">
            Quantity
          </span>
          <input
            className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
            min={1}
            max={250}
            onChange={(event) =>
              setQuantity(Math.min(Math.max(Number(event.target.value) || 1, 1), 250))
            }
            type="number"
            value={quantity}
          />
        </label>
      </div>
    </section>
  );
}

function DfmReportPanel({ dfm, file }: { dfm: DfmReport; file: ParsedCadFile }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">Manufacturability report</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            {dfm.readiness}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {dfm.summary}
          </p>
        </div>
        <span
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            dfm.readiness === "Production ready"
              ? "bg-emerald-100 text-emerald-800"
              : dfm.readiness === "Maker review"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {file.source}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MiniMetric icon={Boxes} label="Volume" value={`${file.volume.toFixed(2)} cm3`} />
        <MiniMetric icon={Factory} label="Envelope" value={file.dimensions} />
        <MiniMetric
          icon={Layers}
          label="Mesh detail"
          value={file.triangleCount ? `${file.triangleCount} triangles` : "STEP topology"}
        />
      </div>

      <div className="mt-5 grid gap-3">
        {dfm.findings.map((finding) => (
          <article
            className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
            key={finding.title}
          >
            <div className="flex items-start gap-3">
              {finding.severity === "high" ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              ) : finding.severity === "medium" ? (
                <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              )}
              <div>
                <h3 className="text-sm font-semibold text-graphite">
                  {finding.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {finding.detail}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuoteStack({
  file,
  quotePrice,
  spec,
}: {
  file: ParsedCadFile;
  quotePrice: number;
  spec: QuoteSpec;
}) {
  const gates = [
    { label: "CAD parsed", ok: true },
    { label: "Material selected", ok: Boolean(spec.material) },
    { label: "Capacity modeled", ok: spec.quantity <= 250 },
    { label: "Maker review", ok: spec.toleranceTarget === "Standard" },
  ];

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Quote stack</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            Decision-ready estimate
          </h2>
        </div>
        <BadgeCheck className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mt-5 rounded-md bg-zinc-900 p-4 text-white">
        <p className="text-xs font-medium uppercase text-zinc-400">Estimated total</p>
        <p className="mt-1 text-4xl font-semibold tracking-normal">
          ${quotePrice.toFixed(2)}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {file.name} / {spec.material} / {spec.infill} / Qty {spec.quantity}
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        {gates.map((gate) => (
          <div
            className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200"
            key={gate.label}
          >
            <span className="text-sm font-semibold text-graphite">{gate.label}</span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                gate.ok
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {gate.ok ? "OK" : "Review"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MakerBidPanel({ bids }: { bids: MakerBid[] }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Maker bid stack</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            Rank operators before sending the RFQ
          </h2>
        </div>
        <LineChart className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {bids.map((bid) => (
          <article className="rounded-md border border-zinc-200 p-4" key={bid.maker.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-graphite">
                  {bid.maker.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {bid.maker.machine} / {bid.leadTime}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  bid.fit === "Best fit"
                    ? "bg-emerald-100 text-emerald-800"
                    : bid.fit === "Good fit"
                      ? "bg-zinc-100 text-zinc-700"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {bid.fit}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <MiniValue label="Bid estimate" value={`$${bid.estimatedPrice.toFixed(2)}`} />
              <MiniValue label="Confidence" value={`${bid.confidence}%`} />
              <MiniValue label="Match" value={`${bid.score}%`} />
              <MiniValue label="Distance" value={bid.maker.distance} />
            </div>
            <p className="mt-3 text-xs font-medium leading-5 text-zinc-500">
              {bid.reasons.slice(0, 4).join(" / ")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScoreCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  tone: "good" | "neutral" | "warn";
  value: string;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-3">
        <div
          className={`grid h-11 w-11 place-items-center rounded-md ${
            tone === "good"
              ? "bg-emerald-100 text-emerald-800"
              : tone === "warn"
                ? "bg-amber-100 text-amber-800"
                : "bg-zinc-100 text-zinc-700"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-graphite">{value}</p>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-graphite">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-graphite">{label}</span>
      <select
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
