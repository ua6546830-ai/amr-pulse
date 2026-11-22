import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { isAiConfigured } from "@/lib/ai/config";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const aiConfigured = isAiConfigured();
  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-xs focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar aiConfigured={aiConfigured} />
      <div className="lg:pl-[248px]">
        <Topbar aiConfigured={aiConfigured} />
        <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-7 lg:py-7 print-page">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 border-t border-line px-4 py-4 text-[10.5px] text-muted lg:flex-row lg:items-center lg:justify-between lg:px-7 print:hidden">
          <p>AMR PULSE · research-support platform · analysis engine 1.0.0 · not for clinical decision-making</p>
          <p>Synthetic demonstration dataset · no real patient or surveillance records</p>
        </footer>
      </div>
    </div>
  );
}
