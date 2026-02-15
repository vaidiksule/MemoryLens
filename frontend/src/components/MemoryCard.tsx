// src/components/MemoryCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Smile, User } from "lucide-react";

export default function MemoryCard({ face }: { face: any }) {
    if (!face.summary && face.name === 'Unknown') return null;

    return (
        <div className="w-48 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg shadow-lg pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 space-y-1.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold flex items-center gap-1.5 text-white/90">
                        <User className="h-3 w-3 text-blue-400" /> {face.name}
                    </span>
                    {face.similarity && (
                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                            {(face.similarity * 100).toFixed(0)}%
                        </span>
                    )}
                </div>

                {/* Content */}
                {face.summary ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                            <Calendar className="h-2.5 w-2.5 shrink-0" />
                            <span>{face.last_met}</span>
                        </div>

                        <div className="flex items-start gap-1.5 text-[9px]">
                            <MessageSquare className="h-2.5 w-2.5 mt-0.5 text-indigo-400 shrink-0" />
                            <p className="line-clamp-2 leading-tight text-zinc-200 font-medium tracking-wide">
                                "{face.summary}"
                            </p>
                        </div>

                        <div className="pt-1 flex items-center gap-1.5 border-t border-white/5 mt-1">
                            <Smile className="h-2.5 w-2.5 text-yellow-400 shrink-0" />
                            <span className="text-[8px] text-zinc-400 uppercase tracking-wider font-bold">{face.emotional_tone || 'Neutral'}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-[9px] text-zinc-500 italic pl-1">No data available.</p>
                )}
            </div>
        </div>
    );
}
