// src/components/MemoryCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Smile, User } from "lucide-react";

export default function MemoryCard({ face }: { face: any }) {
    if (!face.summary && face.name === 'Unknown') return null;

    return (
        <Card className="w-64 bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-2xl pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="h-1 w-full bg-blue-500" />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-2 text-blue-400">
                        <User className="h-3 w-3" /> {face.name}
                    </span>
                    {face.similarity && (
                        <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 bg-white/5">
                            {(face.similarity * 100).toFixed(0)}% Match
                        </Badge>
                    )}
                </div>

                {face.summary ? (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 text-[11px] text-white/50">
                            <Calendar className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>Last met: {face.last_met}</span>
                        </div>

                        <div className="flex items-start gap-2 text-[11px]">
                            <MessageSquare className="h-3 w-3 mt-0.5 text-blue-400 shrink-0" />
                            <p className="line-clamp-4 leading-relaxed text-white/90 italic">
                                "{face.summary}"
                            </p>
                        </div>

                        <div className="pt-1 flex items-center gap-2 border-t border-white/5 mt-2">
                            <Smile className="h-3 w-3 text-green-400 shrink-0" />
                            <span className="text-[10px] text-white/40 uppercase tracking-tighter uppercase">Tone: {face.emotional_tone || 'Neutral'}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-[10px] text-white/40 italic">No previous memories found. Record a note to add context.</p>
                )}
            </CardContent>
        </Card>
    );
}
