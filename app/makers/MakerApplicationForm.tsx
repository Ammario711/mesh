"use client";

import { useState } from "react";

const materialChoices = ["PLA", "ABS", "PETG", "Nylon", "Aluminum", "Steel"];
const processChoices = ["FDM", "SLA", "SLS", "CNC", "Laser", "Finishing"];

type FormState = {
  capacity: string;
  city: string;
  contactName: string;
  email: string;
  equipment: string;
  materials: string[];
  notes: string;
  postalCode: string;
  processes: string[];
  shopName: string;
  website: string;
};

const initialState: FormState = {
  capacity: "",
  city: "",
  contactName: "",
  email: "",
  equipment: "",
  materials: ["PLA", "PETG"],
  notes: "",
  postalCode: "",
  processes: ["FDM"],
  shopName: "",
  website: "",
};

export function MakerApplicationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/maker-applications", {
        body: JSON.stringify({
          application: {
            ...form,
            id: `maker-application-${Date.now()}`,
            submittedAt: new Date().toISOString(),
          },
          website: form.website,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mesh could not save the application.");
      }

      setForm(initialState);
      setMessage({
        kind: "success",
        text: "Application received. Mesh will review your equipment profile before adding capacity to the network.",
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Mesh could not save the application.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleChoice(key: "materials" | "processes", value: string) {
    setForm((current) => {
      const selected = current[key];

      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={submitApplication}>
      <input
        autoComplete="off"
        className="hidden"
        onChange={(event) => updateField("website", event.target.value)}
        tabIndex={-1}
        value={form.website}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Shop name"
          onChange={(value) => updateField("shopName", value)}
          required
          value={form.shopName}
        />
        <TextInput
          label="Contact name"
          onChange={(value) => updateField("contactName", value)}
          value={form.contactName}
        />
        <TextInput
          label="Email"
          onChange={(value) => updateField("email", value)}
          required
          type="email"
          value={form.email}
        />
        <TextInput
          label="City"
          onChange={(value) => updateField("city", value)}
          value={form.city}
        />
        <TextInput
          label="Postal code"
          onChange={(value) => updateField("postalCode", value)}
          value={form.postalCode}
        />
        <TextInput
          label="Daily capacity"
          onChange={(value) => updateField("capacity", value)}
          placeholder="Example: 8 FDM parts/day"
          value={form.capacity}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-graphite">
          Equipment
        </span>
        <textarea
          className="min-h-24 w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
          onChange={(event) => updateField("equipment", event.target.value)}
          placeholder="Printers, CNC machines, bed size, nozzle sizes, inspection tools..."
          value={form.equipment}
        />
      </label>

      <ChoiceGroup
        choices={materialChoices}
        label="Materials"
        onToggle={(value) => toggleChoice("materials", value)}
        selected={form.materials}
      />

      <ChoiceGroup
        choices={processChoices}
        label="Processes"
        onToggle={(value) => toggleChoice("processes", value)}
        selected={form.processes}
      />

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-graphite">
          Notes
        </span>
        <textarea
          className="min-h-24 w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-graphite outline-none transition focus:border-weld focus:ring-4 focus:ring-orange-100"
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Pickup radius, student discounts, rush availability, tolerance limits..."
          value={form.notes}
        />
      </label>

      {message && (
        <div
          className={`rounded-md p-4 text-sm font-semibold ${
            message.kind === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        className="inline-flex h-11 items-center rounded-md bg-graphite px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Apply to Join Mesh"}
      </button>
    </form>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ChoiceGroup({
  choices,
  label,
  onToggle,
  selected,
}: {
  choices: string[];
  label: string;
  onToggle: (value: string) => void;
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-graphite">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const isSelected = selected.includes(choice);

          return (
            <button
              className={`rounded-md px-3 py-2 text-sm font-semibold ring-1 transition ${
                isSelected
                  ? "bg-graphite text-white ring-graphite"
                  : "bg-white text-zinc-700 ring-zinc-300 hover:ring-zinc-400"
              }`}
              key={choice}
              onClick={() => onToggle(choice)}
              type="button"
            >
              {choice}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
