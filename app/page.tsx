"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
import {
  calculateQuote,
  clamp,
  countMatches,
  finishOptions,
  formatBytes,
  getCadFileType,
  infillOptions,
  makers,
  materialOptions,
  scoreMaker,
  toleranceOptions,
  urgencyOptions,
  type FinishKey,
  type InfillKey,
  type JobSubmission,
  type Maker,
  type MakerMatch,
  type MaterialKey,
  type ParsedCadFile,
  type QuoteResult,
  type ToleranceKey,
  type UrgencyKey,
} from "../lib/mesh/domain";

type ViewKey = "new-job" | "my-files" | "local-makers";

type GeometryResult = {
  volume: number;
  dimensions: string;
  triangleCount: number;
  note: string;
};

type Vector3 = {
  x: number;
  y: number;
  z: number;
};

const navItems: { key: ViewKey; label: string; icon: LucideIcon }[] = [
  { key: "new-job", label: "New Job", icon: UploadCloud },
  { key: "my-files", label: "My Files", icon: FileArchive },
  { key: "local-makers", label: "Local Makers", icon: MapPinned },
];

const filesStorageKey = "mesh.files.v1";
const jobsStorageKey = "mesh.jobs.v1";
const maxSavedFiles = 12;

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<ViewKey>("new-job");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeFile, setActiveFile] = useState<ParsedCadFile | null>(null);
  const [savedFiles, setSavedFiles] = useState<ParsedCadFile[]>([]);
  const [jobs, setJobs] = useState<JobSubmission[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [infill, setInfill] = useState<InfillKey>("20%");
  const [finish, setFinish] = useState<FinishKey>("Standard");
  const [toleranceTarget, setToleranceTarget] =
    useState<ToleranceKey>("Standard");
  const [urgency, setUrgency] = useState<UrgencyKey>("Standard");
  const [quantity, setQuantity] = useState(1);
  const [projectName, setProjectName] = useState("Bracket prototype");
  const [notes, setNotes] = useState("");
  const [sentMakerId, setSentMakerId] = useState<number | null>(null);

  useEffect(() => {
    setSavedFiles(readStorage<ParsedCadFile[]>(filesStorageKey, []));
    setJobs(readStorage<JobSubmission[]>(jobsStorageKey, []));
    setStorageReady(true);
    void refreshBackendState();
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(filesStorageKey, JSON.stringify(savedFiles));
    }
  }, [savedFiles, storageReady]);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(jobsStorageKey, JSON.stringify(jobs));
    }
  }, [jobs, storageReady]);

  const quote = useMemo<QuoteResult | null>(() => {
    if (!activeFile) {
      return null;
    }

    return calculateQuote(activeFile, {
      finish,
      infill,
      material,
      quantity,
      toleranceTarget,
      urgency,
    });
  }, [activeFile, finish, infill, material, quantity, toleranceTarget, urgency]);

  const matchedMakers = useMemo(
    () =>
      makers
        .map((maker) =>
          scoreMaker(maker, {
            material,
            quantity,
            toleranceTarget,
            urgency,
          }),
        )
        .sort((a, b) => b.score - a.score),
    [material, quantity, toleranceTarget, urgency],
  );

  const headerContent = {
    "new-job": {
      eyebrow: "New manufacturing job",
      title: "Upload CAD, quote instantly, match locally.",
    },
    "my-files": {
      eyebrow: "Parsed CAD library",
      title: "Review uploaded files and restart quotes.",
    },
    "local-makers": {
      eyebrow: "Supplier network",
      title: "Compare nearby operators before sending work.",
    },
  }[view];

  async function handleFileUpload(file: File) {
    setView("new-job");
    setIsDragging(false);
    setIsParsing(true);
    setProgress(8);
    setParseError(null);
    setSentMakerId(null);

    try {
      await delay(140);
      setProgress(28);
      const parsed = await parseCadFile(file);
      setProgress(76);
      let persisted = parsed;

      try {
        persisted = await persistParsedFile(file, parsed);
      } catch {
        persisted = parsed;
      }

      await delay(220);
      setProgress(100);
      setActiveFile(persisted);
      setSavedFiles((current) =>
        [persisted, ...current.filter((item) => item.id !== persisted.id)].slice(
          0,
          maxSavedFiles,
        ),
      );
    } catch (error) {
      setActiveFile(null);
      setParseError(
        error instanceof Error
          ? error.message
          : "Mesh could not read that CAD file.",
      );
    } finally {
      await delay(180);
      setIsParsing(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void handleFileUpload(file);
    }

    event.target.value = "";
  }

  async function sendJob(maker: Maker) {
    if (!activeFile || !quote) {
      return;
    }

    const match =
      matchedMakers.find((item) => item.maker.id === maker.id)?.score ?? 70;

    const job: JobSubmission = {
      id: `${activeFile.id}-${maker.id}-${Date.now()}`,
      projectName: projectName.trim() || activeFile.name,
      fileName: activeFile.name,
      makerName: maker.name,
      machine: maker.machine,
      material,
      infill,
      finish,
      tolerance: toleranceTarget,
      urgency,
      quantity,
      unitPrice: quote.unitPrice,
      price: quote.price,
      platformFee: quote.platformFee,
      turnaround: quote.turnaround,
      matchScore: match,
      notes,
      status: "Quote Sent",
      sentAt: new Date().toISOString(),
    };

    setSentMakerId(maker.id);
    setJobs((current) => [job, ...current].slice(0, 12));

    try {
      const savedJob = await persistJob(job);
      setJobs((current) =>
        [savedJob, ...current.filter((item) => item.id !== savedJob.id)].slice(
          0,
          12,
        ),
      );
    } catch {
      // Local state already carries the sent job if the API is unavailable.
    }
  }

  function loadSavedFile(file: ParsedCadFile) {
    setActiveFile(file);
    setSentMakerId(null);
    setParseError(null);
    setView("new-job");
  }

  async function refreshBackendState() {
    try {
      const [filesResponse, jobsResponse] = await Promise.all([
        fetch("/api/files"),
        fetch("/api/jobs"),
      ]);
      const [filesPayload, jobsPayload] = await Promise.all([
        filesResponse.ok ? filesResponse.json() : Promise.resolve({}),
        jobsResponse.ok ? jobsResponse.json() : Promise.resolve({}),
      ]);

      if (Array.isArray(filesPayload.files)) {
        setSavedFiles(filesPayload.files.slice(0, maxSavedFiles));
      }

      if (Array.isArray(jobsPayload.jobs)) {
        setJobs(jobsPayload.jobs.slice(0, 12));
      }
    } catch {
      // localStorage remains the offline/demo fallback.
    }
  }

  return (
    <main className="min-h-screen bg-[#eef1f4] text-graphite">
      <input
        accept=".stl,.step,.stp"
        className="hidden"
        onChange={handleInputChange}
        ref={fileInputRef}
        type="file"
      />
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
              const isActive = item.key === view;

              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-graphite shadow-sm"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                  onClick={() => setView(item.key)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-md border border-zinc-700 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-weld" />
              Verified network
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {makers.length} makers loaded, {savedFiles.length} files saved,
              {jobs.length} jobs sent on this device.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-300/80 bg-white px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  {headerContent.eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-graphite lg:text-3xl">
                  {headerContent.title}
                </h1>
              </div>

              <div className="hidden items-center gap-3 xl:flex">
                <StatusPill icon={Factory} label="43 printers online" />
                <StatusPill icon={Clock3} label="Avg. pickup 18h" />
                <StatusPill icon={CircleDollarSign} label="Escrow ready" />
              </div>
            </div>
          </header>

          {view === "new-job" && (
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
                    const file = event.dataTransfer.files?.[0];

                    if (file) {
                      void handleFileUpload(file);
                    }
                  }}
                >
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="grid h-20 w-20 place-items-center rounded-md bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                      {isParsing ? (
                        <Loader2 className="h-9 w-9 animate-spin text-weld" />
                      ) : activeFile ? (
                        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                      ) : (
                        <UploadCloud className="h-9 w-9" />
                      )}
                    </div>

                    <h2 className="mt-6 text-3xl font-semibold tracking-normal text-graphite">
                      {activeFile ? "CAD file parsed" : "Drag & drop CAD files"}
                    </h2>
                    <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
                      STL files are measured directly in the browser. STEP files
                      are accepted with a quoting estimate until CAD-kernel
                      parsing is connected.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                      <button
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-graphite px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                        disabled={isParsing}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        {isParsing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4" />
                        )}
                        Choose CAD File
                      </button>
                      <button
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-400"
                        data-testid="sample-stl-button"
                        disabled={isParsing}
                        onClick={() => void handleFileUpload(createSampleStl())}
                        type="button"
                      >
                        <FileArchive className="h-4 w-4" />
                        Use Sample STL
                      </button>
                    </div>

                    {(isParsing || activeFile || parseError) && (
                      <div className="mt-8 w-full max-w-2xl rounded-md border border-zinc-200 bg-zinc-50 p-4 text-left">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-zinc-700 ring-1 ring-zinc-200">
                              {parseError ? (
                                <SlidersHorizontal className="h-5 w-5 text-weld" />
                              ) : (
                                <FileArchive className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-graphite">
                                {parseError ??
                                  activeFile?.name ??
                                  "Reading geometry..."}
                              </p>
                              <p className="mt-1 text-xs font-medium text-zinc-500">
                                {activeFile
                                  ? `${activeFile.type} / ${activeFile.size} / ${activeFile.source}`
                                  : ".STL, .STEP, .STP"}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-graphite">
                              {isParsing
                                ? `${progress}%`
                                : parseError
                                  ? "Needs review"
                                  : "Parsed"}
                            </p>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              Geometry scan
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              parseError ? "bg-zinc-500" : "bg-weld"
                            }`}
                            style={{ width: `${parseError ? 100 : progress}%` }}
                          />
                        </div>
                        {activeFile && (
                          <p className="mt-3 text-xs font-medium leading-5 text-zinc-500">
                            {activeFile.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <MetricCard
                    icon={Cpu}
                    label="Detected volume"
                    value={activeFile ? `${activeFile.volume.toFixed(2)} cm3` : "--"}
                  />
                  <MetricCard
                    icon={Gauge}
                    label="Part envelope"
                    value={activeFile ? activeFile.dimensions : "--"}
                  />
                  <MetricCard
                    icon={SlidersHorizontal}
                    label="Tolerance"
                    value={activeFile ? activeFile.tolerance : "--"}
                  />
                </section>

                <JobSpecPanel
                  finish={finish}
                  notes={notes}
                  projectName={projectName}
                  quantity={quantity}
                  setFinish={setFinish}
                  setNotes={setNotes}
                  setProjectName={setProjectName}
                  setQuantity={setQuantity}
                  setToleranceTarget={setToleranceTarget}
                  setUrgency={setUrgency}
                  toleranceTarget={toleranceTarget}
                  urgency={urgency}
                />
              </div>

              <aside className="space-y-6">
                <QuotePanel
                  activeFile={activeFile}
                  finish={finish}
                  infill={infill}
                  material={material}
                  quantity={quantity}
                  quote={quote}
                  setInfill={setInfill}
                  setMaterial={setMaterial}
                  toleranceTarget={toleranceTarget}
                />
                <MakerMatchPanel
                  activeFile={activeFile}
                  matches={matchedMakers}
                  quoteReady={Boolean(quote)}
                  sentMakerId={sentMakerId}
                  onSend={sendJob}
                />
              </aside>
            </div>
          )}

          {view === "my-files" && (
            <div className="grid flex-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
              <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      My Files
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-normal">
                      Parsed CAD files
                    </h2>
                  </div>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    onClick={() => {
                      setView("new-job");
                      fileInputRef.current?.click();
                    }}
                    type="button"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {savedFiles.length === 0 ? (
                    <EmptyState
                      title="No CAD files yet"
                      body="Upload an STL or STEP file to build a local quote history."
                    />
                  ) : (
                    savedFiles.map((file) => (
                      <article
                        className="rounded-md border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
                        key={file.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-graphite">
                              {file.name}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600">
                              {file.type} - {file.size} -{" "}
                              {file.volume.toFixed(2)} cm3
                            </p>
                            <p className="mt-2 text-xs font-medium text-zinc-500">
                              {file.dimensions} / {file.source}
                            </p>
                          </div>
                          <button
                            className="inline-flex h-9 shrink-0 items-center rounded-md bg-graphite px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                            onClick={() => loadSavedFile(file)}
                            type="button"
                          >
                            Load Quote
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <RecentJobsPanel jobs={jobs} />
            </div>
          )}

          {view === "local-makers" && (
            <div className="grid flex-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
              <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      Local Makers
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-normal">
                      Available operators
                    </h2>
                  </div>
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                  {matchedMakers.map((match) => (
                    <MakerCard
                      activeFile={activeFile}
                      key={match.maker.id}
                      match={match}
                      quoteReady={Boolean(quote)}
                      sentMakerId={sentMakerId}
                      onSend={sendJob}
                    />
                  ))}
                </div>
              </section>

              <QuotePanel
                activeFile={activeFile}
                finish={finish}
                infill={infill}
                material={material}
                quantity={quantity}
                quote={quote}
                setInfill={setInfill}
                setMaterial={setMaterial}
                toleranceTarget={toleranceTarget}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function persistParsedFile(file: File, parsed: ParsedCadFile) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(parsed));

  const response = await fetch("/api/uploads", {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Mesh could not save the uploaded CAD file.");
  }

  const payload = (await response.json()) as { file?: ParsedCadFile };

  return payload.file ?? parsed;
}

async function persistJob(job: JobSubmission) {
  const response = await fetch("/api/jobs", {
    body: JSON.stringify({ job }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Mesh could not save the sent job.");
  }

  const payload = (await response.json()) as { job?: JobSubmission };

  return payload.job ?? job;
}

function JobSpecPanel({
  projectName,
  quantity,
  finish,
  toleranceTarget,
  urgency,
  notes,
  setProjectName,
  setQuantity,
  setFinish,
  setToleranceTarget,
  setUrgency,
  setNotes,
}: {
  projectName: string;
  quantity: number;
  finish: FinishKey;
  toleranceTarget: ToleranceKey;
  urgency: UrgencyKey;
  notes: string;
  setProjectName: (value: string) => void;
  setQuantity: (value: number) => void;
  setFinish: (value: FinishKey) => void;
  setToleranceTarget: (value: ToleranceKey) => void;
  setUrgency: (value: UrgencyKey) => void;
  setNotes: (value: string) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">RFQ Details</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            Manufacturing requirements
          </h2>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-graphite">
            Project name
          </span>
          <input
            className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
            data-testid="project-name-input"
            onChange={(event) => setProjectName(event.target.value)}
            value={projectName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-graphite">
            Quantity
          </span>
          <input
            className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
            data-testid="quantity-input"
            min={1}
            max={250}
            onChange={(event) =>
              setQuantity(clamp(Number(event.target.value) || 1, 1, 250))
            }
            type="number"
            value={quantity}
          />
        </label>

        <SelectField
          icon={Layers}
          label="Finish"
          value={finish}
          onChange={(value) => setFinish(value as FinishKey)}
          options={finishOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
          testId="finish-select"
          helper={finishOptions.find((option) => option.label === finish)?.description ?? ""}
        />

        <SelectField
          icon={Gauge}
          label="Tolerance Target"
          value={toleranceTarget}
          onChange={(value) => setToleranceTarget(value as ToleranceKey)}
          options={toleranceOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
          testId="tolerance-select"
          helper={
            toleranceOptions.find((option) => option.label === toleranceTarget)
              ?.description ?? ""
          }
        />

        <SelectField
          icon={Clock3}
          label="Timeline"
          value={urgency}
          onChange={(value) => setUrgency(value as UrgencyKey)}
          options={urgencyOptions.map((option) => ({
            label: option.label,
            value: option.label,
          }))}
          testId="urgency-select"
          helper={urgencyOptions.find((option) => option.label === urgency)?.description ?? ""}
        />

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-graphite">
            Notes
          </span>
          <textarea
            className="min-h-24 w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
            data-testid="notes-input"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Thread inserts, cosmetic surfaces, pickup constraints..."
            value={notes}
          />
        </label>
      </div>
    </section>
  );
}

function QuotePanel({
  activeFile,
  quote,
  material,
  infill,
  finish,
  toleranceTarget,
  quantity,
  setMaterial,
  setInfill,
}: {
  activeFile: ParsedCadFile | null;
  quote: QuoteResult | null;
  material: MaterialKey;
  infill: InfillKey;
  finish: FinishKey;
  toleranceTarget: ToleranceKey;
  quantity: number;
  setMaterial: (value: MaterialKey) => void;
  setInfill: (value: InfillKey) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Instant Quote</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            Manufacturing estimate
          </h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-weld">
          <Calculator className="h-5 w-5" />
        </div>
      </div>

      {!activeFile || !quote ? (
        <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-5">
          <p className="text-sm leading-6 text-zinc-600">
            Upload a CAD file to unlock material pricing and maker matching.
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
            testId="material-select"
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
            testId="infill-select"
            helper={quote.selectedInfill.description}
          />

          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-graphite">
                RFQ snapshot
              </p>
              <Clock3 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <QuoteLine
                label="Quantity"
                value={`${quantity} part${quantity === 1 ? "" : "s"}`}
              />
              <QuoteLine label="Finish" value={finish} />
              <QuoteLine label="Tolerance" value={toleranceTarget} />
              <QuoteLine label="Timeline" value={quote.selectedUrgency.leadTime} />
            </div>
            <p className="mt-3 text-xs font-medium leading-5 text-zinc-500">
              Edit project specs in RFQ Details; material and infill update this
              estimate instantly.
            </p>
          </div>

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
                  {activeFile.volume.toFixed(2)} cm3
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <QuoteLine
                label="Unit price"
                value={`$${quote.unitPrice.toFixed(2)}`}
              />
              <QuoteLine
                label="Material use"
                value={`$${quote.materialCost.toFixed(2)}`}
              />
              <QuoteLine
                label="Setup"
                value={`$${quote.setupFee.toFixed(2)}`}
              />
              <QuoteLine
                label="Finish/tolerance"
                value={`$${quote.finishFee.toFixed(2)}`}
              />
              <QuoteLine
                label="Rush"
                value={`$${quote.urgencyFee.toFixed(2)}`}
              />
              <QuoteLine
                label="Platform"
                value={`$${quote.platformFee.toFixed(2)}`}
              />
            </div>

            {quote.quantityDiscount > 0 && (
              <p className="mt-3 text-xs font-semibold text-emerald-700">
                Batch discount applied: {Math.round(quote.quantityDiscount * 100)}%
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MakerMatchPanel({
  activeFile,
  matches,
  quoteReady,
  sentMakerId,
  onSend,
}: {
  activeFile: ParsedCadFile | null;
  matches: MakerMatch[];
  quoteReady: boolean;
  sentMakerId: number | null;
  onSend: (maker: Maker) => void | Promise<void>;
}) {
  return (
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
        {matches.map((match) => (
          <MakerCard
            activeFile={activeFile}
            key={match.maker.id}
            match={match}
            quoteReady={quoteReady}
            sentMakerId={sentMakerId}
            onSend={onSend}
          />
        ))}
      </div>
    </section>
  );
}

function MakerCard({
  activeFile,
  match,
  quoteReady,
  sentMakerId,
  onSend,
}: {
  activeFile: ParsedCadFile | null;
  match: MakerMatch;
  quoteReady: boolean;
  sentMakerId: number | null;
  onSend: (maker: Maker) => void | Promise<void>;
}) {
  const { maker } = match;
  const isSent = sentMakerId === maker.id;

  return (
    <article
      className={`rounded-md border p-4 transition ${
        isSent
          ? "border-emerald-300 bg-emerald-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
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
        <div className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          {match.score}% match
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            match.compatible
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {match.compatible ? "Compatible" : "Manual review"}
        </span>
        {maker.tags.map((tag) => (
          <span
            className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
            key={tag}
          >
          {tag}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs font-medium leading-5 text-zinc-500">
        {match.reasons.join(" / ")}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <Navigation className="h-3.5 w-3.5" />
          {maker.eta} / {maker.capacity} / {maker.rating} rating
        </span>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-graphite px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          data-testid={`send-job-${maker.id}`}
          disabled={!activeFile || !quoteReady || !match.compatible}
          onClick={() => void onSend(maker)}
          type="button"
        >
          {isSent ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSent ? "Sent" : "Send Job"}
        </button>
      </div>
    </article>
  );
}

function RecentJobsPanel({ jobs }: { jobs: JobSubmission[] }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Sent Jobs</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">
            Recent activity
          </h2>
        </div>
        <Send className="h-5 w-5 text-zinc-500" />
      </div>

      <div className="mt-5 space-y-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="No sent jobs"
            body="Send a quote to a local maker to create the first job record."
          />
        ) : (
          jobs.map((job) => (
            <article
              className="rounded-md border border-zinc-200 bg-white p-4"
              key={job.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-graphite">
                    {job.projectName ?? job.fileName}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {job.makerName} - {job.machine}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-graphite">
                    ${job.price.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {job.status}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-zinc-500">
                {job.fileName} / Qty {job.quantity ?? 1} / {job.material} /{" "}
                {job.infill} / {job.finish ?? "Standard"} /{" "}
                {job.turnaround ?? "2-3 days"}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <QuoteLine
                  label="Unit"
                  value={`$${(job.unitPrice ?? job.price).toFixed(2)}`}
                />
                <QuoteLine
                  label="Match"
                  value={`${job.matchScore ?? 70}%`}
                />
                <QuoteLine label="Sent" value={formatDate(job.sentAt)} />
              </div>
              {job.notes && (
                <p className="mt-3 rounded-md bg-zinc-50 p-3 text-xs font-medium leading-5 text-zinc-600">
                  {job.notes}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5">
      <p className="text-sm font-semibold text-graphite">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
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
  icon: LucideIcon;
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
  testId,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  helper: string;
  testId?: string;
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
          data-testid={testId}
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

async function parseCadFile(file: File): Promise<ParsedCadFile> {
  const type = getCadFileType(file.name);

  if (!type) {
    throw new Error("Only .STL, .STEP, and .STP files are supported.");
  }

  if (file.size === 0) {
    throw new Error("That file is empty.");
  }

  const uploadedAt = new Date().toISOString();

  if (type === "STL") {
    const geometry = parseStlGeometry(await file.arrayBuffer());

    return {
      id: createFileId(file),
      name: file.name,
      type,
      size: formatBytes(file.size),
      sizeBytes: file.size,
      volume: geometry.volume,
      dimensions: geometry.dimensions,
      tolerance: "+/- 0.18 mm",
      triangleCount: geometry.triangleCount,
      source: "Exact STL mesh",
      note: geometry.note,
      uploadedAt,
    };
  }

  const text = await file.text();
  const topologyHints = countMatches(text, "ADVANCED_FACE");
  const sizeMb = file.size / (1024 * 1024);
  const estimatedVolume = clamp(18 + sizeMb * 9 + topologyHints * 0.06, 12, 180);
  const estimatedEdge = Math.cbrt(estimatedVolume * 1000);

  return {
    id: createFileId(file),
    name: file.name,
    type,
    size: formatBytes(file.size),
    sizeBytes: file.size,
    volume: estimatedVolume,
    dimensions: `${Math.round(estimatedEdge * 1.55)} x ${Math.round(
      estimatedEdge,
    )} x ${Math.round(estimatedEdge * 0.58)} mm`,
    tolerance: "+/- 0.30 mm",
    triangleCount: null,
    source: "STEP estimate",
    note: "STEP files need a CAD kernel for exact mass properties, so this quote uses file size and topology hints.",
    uploadedAt,
  };
}

function parseStlGeometry(buffer: ArrayBuffer): GeometryResult {
  if (buffer.byteLength < 84) {
    return parseAsciiStl(new TextDecoder().decode(buffer));
  }

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedBinaryLength = 84 + triangleCount * 50;

  if (expectedBinaryLength === buffer.byteLength) {
    return parseBinaryStl(view, triangleCount);
  }

  return parseAsciiStl(new TextDecoder().decode(buffer));
}

function parseBinaryStl(view: DataView, triangleCount: number): GeometryResult {
  const bounds = createBounds();
  let signedVolume = 0;

  for (let index = 0; index < triangleCount; index += 1) {
    const offset = 84 + index * 50 + 12;
    const a = readVector(view, offset);
    const b = readVector(view, offset + 12);
    const c = readVector(view, offset + 24);

    expandBounds(bounds, a);
    expandBounds(bounds, b);
    expandBounds(bounds, c);
    signedVolume += signedTriangleVolume(a, b, c);
  }

  return finalizeGeometry(bounds, signedVolume, triangleCount);
}

function parseAsciiStl(text: string): GeometryResult {
  const bounds = createBounds();
  const vertexPattern =
    /vertex\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;
  const vertices: Vector3[] = [];
  let signedVolume = 0;
  let triangleCount = 0;
  let match = vertexPattern.exec(text);

  while (match) {
    const vertex = {
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3]),
    };

    vertices.push(vertex);
    expandBounds(bounds, vertex);

    if (vertices.length === 3) {
      signedVolume += signedTriangleVolume(vertices[0], vertices[1], vertices[2]);
      triangleCount += 1;
      vertices.length = 0;
    }

    match = vertexPattern.exec(text);
  }

  if (triangleCount === 0) {
    throw new Error("No STL triangles were found in that file.");
  }

  return finalizeGeometry(bounds, signedVolume, triangleCount);
}

function finalizeGeometry(
  bounds: ReturnType<typeof createBounds>,
  signedVolume: number,
  triangleCount: number,
): GeometryResult {
  const sizeX = bounds.max.x - bounds.min.x;
  const sizeY = bounds.max.y - bounds.min.y;
  const sizeZ = bounds.max.z - bounds.min.z;
  const boxVolume = Math.max(sizeX * sizeY * sizeZ, 0);
  let volumeMm3 = Math.abs(signedVolume);
  let note = "Watertight STL volume computed from mesh triangles.";

  if (!Number.isFinite(volumeMm3) || volumeMm3 < 0.001) {
    volumeMm3 = boxVolume * 0.22;
    note = "STL mesh was not watertight enough for exact volume, so Mesh used a bounding-box fallback.";
  }

  return {
    volume: Math.max(volumeMm3 / 1000, 0.1),
    dimensions: `${Math.round(sizeX)} x ${Math.round(sizeY)} x ${Math.round(
      sizeZ,
    )} mm`,
    triangleCount,
    note,
  };
}

function createBounds() {
  return {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
}

function expandBounds(bounds: ReturnType<typeof createBounds>, vertex: Vector3) {
  bounds.min.x = Math.min(bounds.min.x, vertex.x);
  bounds.min.y = Math.min(bounds.min.y, vertex.y);
  bounds.min.z = Math.min(bounds.min.z, vertex.z);
  bounds.max.x = Math.max(bounds.max.x, vertex.x);
  bounds.max.y = Math.max(bounds.max.y, vertex.y);
  bounds.max.z = Math.max(bounds.max.z, vertex.z);
}

function readVector(view: DataView, offset: number): Vector3 {
  return {
    x: view.getFloat32(offset, true),
    y: view.getFloat32(offset + 4, true),
    z: view.getFloat32(offset + 8, true),
  };
}

function signedTriangleVolume(a: Vector3, b: Vector3, c: Vector3) {
  return (
    (a.x * (b.y * c.z - b.z * c.y) -
      a.y * (b.x * c.z - b.z * c.x) +
      a.z * (b.x * c.y - b.y * c.x)) /
    6
  );
}

function createSampleStl() {
  const vertices = [
    [0, 0, 0],
    [60, 0, 0],
    [60, 34, 0],
    [0, 34, 0],
    [0, 0, 18],
    [60, 0, 18],
    [60, 34, 18],
    [0, 34, 18],
  ];
  const faces = [
    [0, 2, 1],
    [0, 3, 2],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [3, 6, 2],
    [3, 7, 6],
    [0, 4, 7],
    [0, 7, 3],
    [1, 2, 6],
    [1, 6, 5],
  ];
  const triangles = faces
    .map((face) => {
      const [a, b, c] = face.map((index) => vertices[index]);

      return [
        "  facet normal 0 0 0",
        "    outer loop",
        `      vertex ${a[0]} ${a[1]} ${a[2]}`,
        `      vertex ${b[0]} ${b[1]} ${b[2]}`,
        `      vertex ${c[0]} ${c[1]} ${c[2]}`,
        "    endloop",
        "  endfacet",
      ].join("\n");
    })
    .join("\n");
  const stl = `solid sample_bracket\n${triangles}\nendsolid sample_bracket`;

  return new File([stl], "sample_bracket_mount.stl", {
    type: "model/stl",
    lastModified: 1700000000000,
  });
}

function createFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
