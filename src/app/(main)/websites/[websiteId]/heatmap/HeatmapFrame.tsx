'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HeatmapPoint } from '@/components/hooks/queries/useHeatmapDataQuery';
import { HeatmapCanvas } from './HeatmapCanvas';

interface HeatmapFrameProps {
  urlPath: string;
  domain?: string;
  points: HeatmapPoint[];
}

// Default iframe preview height matching a common desktop viewport
const FRAME_HEIGHT = 768;
// Time to wait after iframe load event before checking if content rendered
const FRAME_LOAD_TIMEOUT = 3000;

export function HeatmapFrame({ urlPath, domain, points }: HeatmapFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);
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

  // Detect X-Frame-Options blocks: the onError event doesn't fire for
  // X-Frame-Options / CSP frame-ancestors blocks. Instead, we use a timeout —
  // if the iframe's load event hasn't fired within FRAME_LOAD_TIMEOUT ms,
  // we assume the frame was blocked and show the fallback.
  useEffect(() => {
    loadedRef.current = false;
    setFrameBlocked(false);

    const timeout = setTimeout(() => {
      if (!loadedRef.current) {
        setFrameBlocked(true);
      }
    }, FRAME_LOAD_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [urlPath, domain]);

  const handleLoad = useCallback(() => {
    loadedRef.current = true;
    setFrameBlocked(false);
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
          ref={iframeRef}
          src={src}
          title="Heatmap preview"
          sandbox="allow-same-origin"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            border: 'none',
            pointerEvents: 'none',
          }}
          onLoad={handleLoad}
          onError={() => setFrameBlocked(true)}
        />
      )}
      <HeatmapCanvas points={points} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
