// src/app/page.tsx
import WebcamView from "@/components/WebcamView";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center gap-12">
        {/* Header */}
        <header className="text-center space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-medium tracking-wider uppercase animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
            Frontier AI Active
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            MemoryLens
          </h1>
          <p className="text-neutral-400 text-lg font-light leading-relaxed">
            Augmented Social Memory. <br />
            <span className="text-white/60">Identify faces. Recall context. Never forget a name.</span>
          </p>
        </header>

        {/* Main View */}
        <section className="w-full max-w-5xl">
          <WebcamView />
        </section>

        {/* Footer / Privacy */}
        <footer className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-500 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              Secure Embeddings
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-800" />
            <span>Assistive Tech</span>
            <span className="w-1 h-1 rounded-full bg-neutral-800" />
            <span>User Controlled</span>
          </div>
          <p className="text-[10px] text-neutral-600 max-w-md mx-auto leading-relaxed">
            All face embeddings are stored securely. MemoryLens is designed as an assistive tool for professional networking and neurodivergent memory support.
          </p>
        </footer>
      </div>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </main>
  );
}
