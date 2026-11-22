import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid-paper flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas">
          <Compass className="h-5 w-5 text-muted" />
        </div>
        <p className="mono-label mt-4">404 · route not found</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">This page is not part of the workspace</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Check the URL, or return to the research overview. No data was changed.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[13px] font-medium text-white hover:bg-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Research overview
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-canvas"
          >
            Landing page
          </Link>
        </div>
      </div>
    </div>
  );
}
