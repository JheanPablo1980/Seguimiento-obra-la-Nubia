import React, { useRef, useEffect, useState } from 'react';
import { InspectionElement } from '../types';

interface MemoriaCanvasMiniatureProps {
  blueprintImg: HTMLImageElement | null;
  elements: InspectionElement[];
}

export const MemoriaCanvasMiniature: React.FC<MemoriaCanvasMiniatureProps> = ({ blueprintImg, elements }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !blueprintImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (dimensions.width === 0 || dimensions.height === 0) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const imgWidth = blueprintImg.width;
    const imgHeight = blueprintImg.height;

    // Use Math.min to ensure the entire blueprint fits in the canvas
    const scale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Center the map in the canvas
    const dx = (canvas.width - imgWidth * scale) / 2;
    const dy = (canvas.height - imgHeight * scale) / 2;

    ctx.translate(dx, dy);
    ctx.scale(scale, scale);

    ctx.globalAlpha = 0.5;
    ctx.drawImage(blueprintImg, 0, 0);
    ctx.globalAlpha = 1.0;

    elements.forEach(el => {
      let color = '#94a3b8';
      if (el.status === 'En proceso') color = '#f59e0b';
      if (el.status === 'Terminado') color = '#10b981';

      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6 / scale;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Círculo con borde rojo alrededor del tramo
        const cx = (el.x + el.x2) / 2;
        const cy = (el.y + el.y2) / 2;
        const lineLength = Math.hypot(el.x2 - el.x, el.y2 - el.y);
        ctx.beginPath();
        ctx.arc(cx, cy, (lineLength / 2) + (30 / scale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444'; // Tailwind rose-500 or red-500
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      } else if (el.type === 'camera') {
        const radius = Math.max(15, 10 / scale);
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();

        // Círculo con borde rojo alrededor de la cámara
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius + (20 / scale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [blueprintImg, elements, dimensions]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas 
        ref={canvasRef}
        className="block w-full h-full opacity-80"
      />
    </div>
  );
};
