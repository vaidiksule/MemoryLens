import WebcamView from "@/components/WebcamView";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 relative overflow-hidden">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Header */}
        <header className="w-full max-w-5xl flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-md shadow-slate-900/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                MemoryLens
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-slate-200 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-slate-600">Frontier AI Active</span>
            </div>

            <Link href="/memories">
              <Button variant="outline" size="sm" className="rounded-lg shadow-sm border-slate-200 bg-white/80 backdrop-blur hover:bg-white hover:text-blue-600 transition-colors">
                <Database className="h-4 w-4 mr-2" />
                History DB
              </Button>
            </Link>
          </div>
        </header>

        {/* Main View - MacBook Style Frame */}
        <section className="w-full max-w-5xl">
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5">
            {/* Window Controls / Top Bar */}
            <div className="h-10 bg-slate-100/50 border-b border-slate-200/60 flex items-center px-4 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80 border border-red-500/10 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80 border border-amber-500/10 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80 border border-emerald-500/10 shadow-sm" />
              </div>
              <div className="flex bg-slate-200/50 rounded-md px-3 py-1 items-center gap-2 w-1/3 justify-center opacity-60">
                <div className="w-3 h-3 rounded-full bg-slate-400/30" />
                <div className="h-1.5 w-20 bg-slate-400/20 rounded-full" />
              </div>
              <div className="w-10" />
            </div>

            {/* Viewport content */}
            <div className="relative bg-slate-900 aspect-video">
              <WebcamView />
            </div>
          </div>
        </section>

        {/* Footer / Privacy */}
        <footer className="mt-8 text-center space-y-4 pb-8">
          <p className="text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed">
            All face embeddings are stored securely. MemoryLens is designed as an assistive tool.
          </p>
        </footer>
      </div>
      <Toaster position="bottom-right" theme="light" closeButton />
    </main>
  );
}
