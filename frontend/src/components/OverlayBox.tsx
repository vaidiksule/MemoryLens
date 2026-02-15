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
            className={`absolute border-2 rounded-lg transition-all duration-300 ${face.name === 'Unknown' ? 'border-white/30' : 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                }`}
            style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${right - left}px`,
                height: `${bottom - top}px`,
            }}
        >
            <div className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${face.name === 'Unknown' ? 'bg-neutral-800 text-white/70' : 'bg-blue-600 text-white'
                }`}>
                {face.name}
            </div>
        </div>
    );
}
