"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  JobStatus,
  MakerApplicationStatus,
} from "../../lib/mesh/domain";

const makerStatuses: MakerApplicationStatus[] = [
  "Reviewing",
  "Approved",
  "Declined",
];

const jobStatuses: JobStatus[] = [
  "Quote Sent",
  "Accepted",
  "In Production",
  "Ready",
];

export function MakerApplicationActions({
  id,
  status,
}: {
  id: string;
  status: MakerApplicationStatus;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: MakerApplicationStatus) {
    setIsWorking(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/maker-applications/${id}`, {
        body: JSON.stringify({ status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update application.");
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update application.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {makerStatuses.map((nextStatus) => (
        <button
          className={`h-9 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed ${
            status === nextStatus
              ? "bg-zinc-200 text-zinc-600"
              : nextStatus === "Approved"
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : nextStatus === "Declined"
                  ? "bg-red-700 text-white hover:bg-red-800"
                  : "bg-graphite text-white hover:bg-zinc-800"
          }`}
          disabled={isWorking || status === nextStatus}
          key={nextStatus}
          onClick={() => void updateStatus(nextStatus)}
          type="button"
        >
          {nextStatus}
        </button>
      ))}
      {message && <p className="text-xs font-semibold text-red-700">{message}</p>}
    </div>
  );
}

export function JobStatusActions({
  id,
  status,
}: {
  id: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<JobStatus>(status);
  const [note, setNote] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus() {
    setIsWorking(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/jobs/${id}/status`, {
        body: JSON.stringify({ note, status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update job.");
      }

      setNote("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update job.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
      <select
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
        onChange={(event) => setNextStatus(event.target.value as JobStatus)}
        value={nextStatus}
      >
        {jobStatuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <input
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Internal note"
        value={note}
      />
      <button
        className="h-10 rounded-md bg-graphite px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        disabled={isWorking}
        onClick={() => void updateStatus()}
        type="button"
      >
        {isWorking ? "Saving..." : "Update"}
      </button>
      {message && (
        <p className="text-xs font-semibold text-red-700 sm:col-span-3">
          {message}
        </p>
      )}
    </div>
  );
}
