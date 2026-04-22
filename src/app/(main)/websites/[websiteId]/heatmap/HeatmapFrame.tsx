'use client';
import { useEffect, useRef, useState } from 'react';
import type { HeatmapPoint } from './HeatmapCanvas';
import { HeatmapCanvas } from './HeatmapCanvas';

interface HeatmapFrameProps {
  urlPath: string;
  domain?: string;
  points: HeatmapPoint[];
}

const FRAME_HEIGHT = 768;

export function HeatmapFrame({ urlPath, domain, points }: HeatmapFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: FRAME_HEIGHT });
  const [frameBlocked, setFrameBlocked] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width, height: FRAME_HEIGHT });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const src = domain ? `https://${domain}${urlPath}` : urlPath;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: FRAME_HEIGHT, overflow: 'hidden' }}
    >
      {frameBlocked ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'repeating-linear-gradient(45deg, #f0f0f0 0px, #f0f0f0 10px, #fafafa 10px, #fafafa 20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 14,
          }}
        >
          Page preview unavailable (X-Frame-Options restriction)
        </div>
      ) : (
        <iframe
          src={src}
          title="Heatmap preview"
          sandbox="allow-same-origin allow-scripts"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            border: 'none',
            pointerEvents: 'none',
          }}
          onError={() => setFrameBlocked(true)}
        />
      )}
      <HeatmapCanvas points={points} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
