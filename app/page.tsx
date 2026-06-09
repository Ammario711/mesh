"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Cpu,
  Factory,
  FileArchive,
  Gauge,
  Layers,
  Loader2,
  MapPinned,
  Navigation,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Users,
} from "lucide-react";

type MaterialKey = "PLA" | "ABS" | "PETG";
type InfillKey = "20%" | "50%" | "100%";

type MaterialOption = {
  name: MaterialKey;
  rate: number;
  description: string;
};

type InfillOption = {
  label: InfillKey;
  multiplier: number;
  description: string;
};

type Maker = {
  id: number;
  name: string;
  machine: string;
  distance: string;
  rating: string;
  eta: string;
  tags: string[];
};

const materialOptions: MaterialOption[] = [
  { name: "PLA", rate: 0.35, description: "Fast prototype resin-like finish" },
  { name: "ABS", rate: 0.42, description: "Heat-tolerant functional parts" },
  { name: "PETG", rate: 0.48, description: "Durable, clean layer bonding" },
];

const infillOptions: InfillOption[] = [
  { label: "20%", multiplier: 1, description: "Light validation model" },
  { label: "50%", multiplier: 1.35, description: "Balanced functional part" },
  { label: "100%", multiplier: 2.15, description: "Maximum density output" },
];

const makers: Maker[] = [
  {
    id: 1,
    name: "MakerSpace Mississauga",
    machine: "Prusa MK4",
    distance: "2.4 miles away",
    rating: "4.9",
    eta: "Ready today",
    tags: ["FDM", "PLA/PETG", "Student friendly"],
  },
  {
    id: 2,
    name: "ForgeLab Etobicoke",
    machine: "Bambu X1 Carbon",
    distance: "5.8 miles away",
    rating: "4.8",
    eta: "Ships tomorrow",
    tags: ["FDM", "ABS", "Tight tolerance"],
  },
  {
    id: 3,
    name: "Northline CNC & Print",
    machine: "Shapeoko Pro CNC",
    distance: "8.1 miles away",
    rating: "4.7",
    eta: "2 day queue",
    tags: ["CNC", "Nylon", "Batch runs"],
  },
];

const navItems = [
  { label: "New Job", icon: UploadCloud, active: true },
  { label: "My Files", icon: FileArchive, active: false },
  { label: "Local Makers", icon: MapPinned, active: false },
];

const parsedFile = {
  name: "bracket_mount_v7.step",
  type: "STEP",
  size: "12.8 MB",
  volume: 38.6,
  dimensions: "84 x 42 x 18 mm",
  tolerance: "+/- 0.18 mm",
};

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [infill, setInfill] = useState<InfillKey>("20%");
  const [sentMakerId, setSentMakerId] = useState<number | null>(null);

  useEffect(() => {
    if (!isParsing) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 14, 100);

        if (next === 100) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            setIsParsing(false);
            setIsParsed(true);
          }, 350);
        }

        return next;
      });
    }, 210);

    return () => window.clearInterval(timer);
  }, [isParsing]);

  const quote = useMemo(() => {
    const selectedMaterial =
      materialOptions.find((option) => option.name === material) ??
      materialOptions[0];
    const selectedInfill =
      infillOptions.find((option) => option.label === infill) ??
      infillOptions[0];
    const setupFee = 4.99;
    const subtotal =
      parsedFile.volume * selectedMaterial.rate * selectedInfill.multiplier +
      setupFee;
    const price = subtotal;

    return {
      price,
      materialCost: parsedFile.volume * selectedMaterial.rate,
      setupFee,
      selectedMaterial,
      selectedInfill,
    };
  }, [material, infill]);

  function startMockUpload() {
    setIsDragging(false);
    setIsParsed(false);
    setIsParsing(true);
    setProgress(0);
    setSentMakerId(null);
  }

  return (
    <main className="min-h-screen bg-[#eef1f4] text-graphite">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-300/70 bg-[#151719] px-5 py-6 text-zinc-100 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-weld text-white shadow-lg shadow-orange-950/20">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-normal">Mesh</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Local fabrication
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                    item.active
                      ? "bg-white text-graphite shadow-sm"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                  href="#"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto rounded-md border border-zinc-700 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-weld" />
              Verified network
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              128 makers within 25 miles with live material and machine
              availability.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-300/80 bg-white px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  New manufacturing job
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-graphite lg:text-3xl">
                  Upload CAD, quote instantly, match locally.
                </h1>
              </div>

              <div className="hidden items-center gap-3 xl:flex">
                <StatusPill icon={Factory} label="43 printers online" />
                <StatusPill icon={Clock3} label="Avg. pickup 18h" />
                <StatusPill icon={CircleDollarSign} label="Escrow ready" />
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
            <div className="min-w-0 space-y-6">
              <section
                className={`rounded-md border-2 border-dashed bg-white p-6 shadow-panel transition lg:p-8 ${
                  isDragging
                    ? "border-weld bg-orange-50"
                    : "border-zinc-300 hover:border-zinc-400"
                }`}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  startMockUpload();
                }}
              >
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-md bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                    {isParsing ? (
                      <Loader2 className="h-9 w-9 animate-spin text-weld" />
                    ) : isParsed ? (
                      <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                    ) : (
                      <UploadCloud className="h-9 w-9" />
                    )}
                  </div>

                  <h2 className="mt-6 text-3xl font-semibold tracking-normal text-graphite">
                    {isParsed ? "CAD file parsed" : "Drag & drop CAD files"}
                  </h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
                    Upload .STL or .STEP geometry to calculate volume, material
                    use, and local maker availability.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <button
                      className="inline-flex h-11 items-center gap-2 rounded-md bg-graphite px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                      disabled={isParsing}
                      onClick={startMockUpload}
                      type="button"
                    >
                      {isParsing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4" />
                      )}
                      Upload Mock File
                    </button>
                    <span className="inline-flex h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-600">
                      .STL, .STEP
                    </span>
                  </div>

                  {(isParsing || isParsed) && (
                    <div className="mt-8 w-full max-w-2xl rounded-md border border-zinc-200 bg-zinc-50 p-4 text-left">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-zinc-700 ring-1 ring-zinc-200">
                            <FileArchive className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-graphite">
                              {parsedFile.name}
                            </p>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              {parsedFile.type} / {parsedFile.size}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-graphite">
                            {isParsing ? `${progress}%` : "Parsed"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-500">
                            Geometry scan
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-weld transition-all duration-300"
                          style={{ width: `${isParsed ? 100 : progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  icon={Cpu}
                  label="Detected volume"
                  value={isParsed ? `${parsedFile.volume} cm³` : "--"}
                />
                <MetricCard
                  icon={Gauge}
                  label="Part envelope"
                  value={isParsed ? parsedFile.dimensions : "--"}
                />
                <MetricCard
                  icon={SlidersHorizontal}
                  label="Tolerance"
                  value={isParsed ? parsedFile.tolerance : "--"}
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      Instant Quote
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-normal">
                      Manufacturing estimate
                    </h2>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-weld">
                    <Calculator className="h-5 w-5" />
                  </div>
                </div>

                {!isParsed ? (
                  <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-5">
                    <p className="text-sm leading-6 text-zinc-600">
                      The quote calculator unlocks after the mock CAD parser
                      finishes reading the part geometry.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <SelectField
                      icon={Layers}
                      label="Material"
                      value={material}
                      onChange={(value) => setMaterial(value as MaterialKey)}
                      options={materialOptions.map((option) => ({
                        label: option.name,
                        value: option.name,
                      }))}
                      helper={quote.selectedMaterial.description}
                    />

                    <SelectField
                      icon={Boxes}
                      label="Infill Density"
                      value={infill}
                      onChange={(value) => setInfill(value as InfillKey)}
                      options={infillOptions.map((option) => ({
                        label: option.label,
                        value: option.label,
                      }))}
                      helper={quote.selectedInfill.description}
                    />

                    <div className="rounded-md border border-zinc-200 bg-[#f8fafc] p-4">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-500">
                            Estimated price
                          </p>
                          <p className="mt-1 text-4xl font-semibold tracking-normal text-graphite">
                            ${quote.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2 text-right ring-1 ring-zinc-200">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                            Volume
                          </p>
                          <p className="mt-1 text-sm font-semibold text-graphite">
                            {parsedFile.volume} cm³
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <QuoteLine
                          label="Material use"
                          value={`$${quote.materialCost.toFixed(2)}`}
                        />
                        <QuoteLine
                          label="Setup"
                          value={`$${quote.setupFee.toFixed(2)}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      Available Local Makers
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-normal">
                      Best matches nearby
                    </h2>
                  </div>
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>

                <div className="mt-5 space-y-3">
                  {makers.map((maker) => (
                    <article
                      className={`rounded-md border p-4 transition ${
                        sentMakerId === maker.id
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                      key={maker.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-graphite">
                            {maker.name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-600">
                            {maker.machine} - {maker.distance}
                          </p>
                        </div>
                        <div className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                          {maker.rating}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {maker.tags.map((tag) => (
                          <span
                            className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                          <Navigation className="h-3.5 w-3.5" />
                          {maker.eta}
                        </span>
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-graphite px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                          disabled={!isParsed}
                          onClick={() => setSentMakerId(maker.id)}
                          type="button"
                        >
                          {sentMakerId === maker.id ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {sentMakerId === maker.id ? "Sent" : "Send Job"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: typeof Factory;
  label: string;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-600">
      <Icon className="h-4 w-4 text-zinc-500" />
      {label}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 truncate text-base font-semibold text-graphite">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function SelectField({
  icon: Icon,
  label,
  value,
  options,
  helper,
  onChange,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  helper: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite">
        <Icon className="h-4 w-4 text-zinc-500" />
        {label}
      </span>
      <span className="relative block">
        <select
          className="h-12 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-10 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </span>
      <span className="mt-2 block text-xs font-medium text-zinc-500">
        {helper}
      </span>
    </label>
  );
}

function QuoteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-graphite">{value}</p>
    </div>
  );
}
