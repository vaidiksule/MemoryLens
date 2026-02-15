// src/components/OverlayBox.tsx
import React from 'react';

interface OverlayBoxProps {
    face: {
        bbox: [number, number, number, number]; // [top, right, bottom, left]
        name: string;
    };
}

export default function OverlayBox({ face }: OverlayBoxProps) {
    const [top, right, bottom, left] = face.bbox;

    return (
        <div
            className={`absolute border rounded-lg transition-all duration-300 ${face.name === 'Unknown' ? 'border-zinc-500/30' : 'border-emerald-400/50'
                }`}
            style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${right - left}px`,
                height: `${bottom - top}px`,
            }}
        >
            <div className={`absolute -top-5 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transform scale-x-[-1] backdrop-blur-md shadow-lg ${face.name === 'Unknown' ? 'bg-black/40 text-zinc-400 border border-zinc-700/50' : 'bg-emerald-900/80 text-emerald-100 border border-emerald-500/30'
                }`}>
                {face.name}
            </div>
        </div>
    );
}
