'use client';
import { useEffect, useRef } from 'react';

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  width: number;
  height: number;
}

// RADIUS: blur spread in pixels for each data point's radial gradient
const RADIUS = 30;
// MAX_OPACITY: maximum alpha intensity of the heatmap overlay (0–1)
const MAX_OPACITY = 0.8;

function buildColormap(): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(0,0,255,0)');
  grad.addColorStop(0.25, 'rgba(0,255,255,1)');
  grad.addColorStop(0.5, 'rgba(0,255,0,1)');
  grad.addColorStop(0.75, 'rgba(255,255,0,1)');
  grad.addColorStop(1, 'rgba(255,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export function HeatmapCanvas({ points, width, height }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw density layer using radial gradients on an off-screen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d')!;

    const maxCount = Math.max(...points.map(p => p.count));

    for (const { x, y, count } of points) {
      // Coordinates are stored as permille (0–10000) of viewport dimensions
      const px = (x / 10000) * width;
      const py = (y / 10000) * height;
      const alpha = Math.min(1, count / maxCount);

      const grad = offCtx.createRadialGradient(px, py, 0, px, py, RADIUS);
      grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      offCtx.fillStyle = grad;
      offCtx.fillRect(px - RADIUS, py - RADIUS, RADIUS * 2, RADIUS * 2);
    }

    // Colorise
    const imageData = offCtx.getImageData(0, 0, width, height);
    const colormap = buildColormap();
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const cmIdx = alpha * 4;
        data[i] = colormap[cmIdx];
        data[i + 1] = colormap[cmIdx + 1];
        data[i + 2] = colormap[cmIdx + 2];
        data[i + 3] = Math.round(alpha * MAX_OPACITY);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [points, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
