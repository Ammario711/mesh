"use client";

import { useState } from "react";

type Step = "start" | "verify";

export function LoginForm() {
  const [step, setStep] = useState<Step>("start");
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/start", {
        body: JSON.stringify({ email, role }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        challengeId?: string;
        devCode?: string;
        error?: string;
      };

      if (!response.ok || !payload.challengeId) {
        throw new Error(payload.error ?? "Could not send login code.");
      }

      setChallengeId(payload.challengeId);
      setDevCode(payload.devCode ?? null);
      setStep("verify");
      setMessage("Check your email for a Mesh login code.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify", {
        body: JSON.stringify({ challengeId, code, name, organization }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        user?: { role?: string };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not verify login.");
      }

      window.location.href = payload.user?.role === "admin" ? "/admin" : "/account";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return step === "start" ? (
    <form className="mt-6 space-y-4" onSubmit={startLogin}>
      <Field label="Email" onChange={setEmail} required type="email" value={email} />
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-graphite">
          Account type
        </span>
        <select
          className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
          onChange={(event) => setRole(event.target.value)}
          value={role}
        >
          <option value="buyer">Buyer</option>
          <option value="maker">Maker</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <SubmitButton disabled={isSubmitting} label="Send Login Code" />
      {message && <p className="text-sm font-semibold text-amber-700">{message}</p>}
    </form>
  ) : (
    <form className="mt-6 space-y-4" onSubmit={verifyLogin}>
      <Field label="Code" onChange={setCode} required value={code} />
      <Field label="Name" onChange={setName} value={name} />
      <Field
        label="Organization"
        onChange={setOrganization}
        value={organization}
      />
      {devCode && (
        <p className="rounded-md bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
          Dev code: {devCode}
        </p>
      )}
      <SubmitButton disabled={isSubmitting} label="Verify and Continue" />
      {message && <p className="text-sm font-semibold text-amber-700">{message}</p>}
    </form>
  );
}

function Field({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-graphite">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      className="inline-flex h-11 items-center rounded-md bg-graphite px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      disabled={disabled}
      type="submit"
    >
      {disabled ? "Working..." : label}
    </button>
  );
}
