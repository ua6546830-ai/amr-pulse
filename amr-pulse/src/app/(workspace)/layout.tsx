import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { isAiConfigured } from "@/lib/ai/config";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const aiConfigured = isAiConfigured();
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-xs focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar aiConfigured={aiConfigured} />
      <div className="lg:pl-[268px]">
        <Topbar aiConfigured={aiConfigured} />
        <main id="main-content" className="mx-auto w-full max-w-[1420px] px-4 py-7 lg:px-8 lg:py-9 print-page">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1420px] flex-col gap-1.5 border-t border-line/80 px-4 py-5 text-[10.5px] text-faint lg:flex-row lg:items-center lg:justify-between lg:px-8 print:hidden">
          <p>AMR PULSE · research-support platform · engine 1.0.0 · not for clinical decision-making</p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-warn-600/70" />
            Synthetic demonstration dataset · no patient or surveillance records
          </p>
        </footer>
      </div>
    </div>
  );
}
