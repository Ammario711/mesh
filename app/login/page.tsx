import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to Mesh with a passwordless email code.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#eef1f4] px-5 py-10 text-graphite">
      <section className="mx-auto max-w-xl rounded-md border border-zinc-200 bg-white p-6 shadow-panel">
        <Link className="text-sm font-semibold text-weld" href="/">
          Back to Mesh
        </Link>
        <p className="mt-8 text-sm font-medium text-zinc-500">Account access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Log in to Mesh
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600">
          Mesh uses passwordless email codes for buyers, makers, and admins.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
