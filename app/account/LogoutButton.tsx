"use client";

import { useState } from "react";

export function LogoutButton() {
  const [isWorking, setIsWorking] = useState(false);

  async function logout() {
    setIsWorking(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      className="mt-3 inline-flex h-10 items-center rounded-md bg-graphite px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      disabled={isWorking}
      onClick={() => void logout()}
      type="button"
    >
      {isWorking ? "Logging out..." : "Log out"}
    </button>
  );
}
