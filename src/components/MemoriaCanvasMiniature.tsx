import React, { useRef, useEffect, useState } from 'react';
import { InspectionElement } from '../types';

interface MemoriaCanvasMiniatureProps {
  blueprintImg: HTMLImageElement | null;
  elements: InspectionElement[];
}

export const MemoriaCanvasMiniature: React.FC<MemoriaCanvasMiniatureProps> = ({ blueprintImg, elements }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 400 });

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: Math.round(entry.contentRect.width),
            height: Math.round(entry.contentRect.height)
          });
        }
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

    // Retina / High-DPI canvas buffer for crystal clarity
    const dpr = 2;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    ctx.scale(dpr, dpr);

    const imgWidth = blueprintImg.width;
    const imgHeight = blueprintImg.height;

    // Filter elements with valid numeric coordinates
    const validElements = elements.filter(el => typeof el.x === 'number' && typeof el.y === 'number');

    let viewBox = { x: 0, y: 0, width: imgWidth, height: imgHeight };

    if (validElements.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      validElements.forEach(el => {
        minX = Math.min(minX, el.x);
        maxX = Math.max(maxX, el.x);
        minY = Math.min(minY, el.y);
        maxY = Math.max(maxY, el.y);
        if (el.type === 'line' && typeof el.x2 === 'number' && typeof el.y2 === 'number') {
          minX = Math.min(minX, el.x2);
          maxX = Math.max(maxX, el.x2);
          minY = Math.min(minY, el.y2);
          maxY = Math.max(maxY, el.y2);
        }
      });

      // Add generous margin around elements to show context in blueprint
      const spanX = Math.max(maxX - minX, 80);
      const spanY = Math.max(maxY - minY, 80);
      const padX = Math.max(120, spanX * 0.45);
      const padY = Math.max(120, spanY * 0.45);

      let boxX = Math.max(0, minX - padX);
      let boxY = Math.max(0, minY - padY);
      let boxW = Math.min(imgWidth - boxX, spanX + padX * 2);
      let boxH = Math.min(imgHeight - boxY, spanY + padY * 2);

      // Ensure minimum view dimensions so single elements aren't over-zoomed
      const minBoxDim = Math.min(imgWidth, Math.max(500, imgHeight * 0.3));
      if (boxW < minBoxDim) {
        const diff = minBoxDim - boxW;
        boxX = Math.max(0, boxX - diff / 2);
        boxW = Math.min(imgWidth - boxX, minBoxDim);
      }
      if (boxH < minBoxDim * 0.6) {
        const diff = minBoxDim * 0.6 - boxH;
        boxY = Math.max(0, boxY - diff / 2);
        boxH = Math.min(imgHeight - boxY, minBoxDim * 0.6);
      }

      viewBox = { x: boxX, y: boxY, width: boxW, height: boxH };
    }

    const scale = Math.min(dimensions.width / viewBox.width, dimensions.height / viewBox.height);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    
    // Center the viewBox in the canvas
    const dx = (dimensions.width - viewBox.width * scale) / 2;
    const dy = (dimensions.height - viewBox.height * scale) / 2;

    ctx.translate(dx, dy);
    ctx.scale(scale, scale);
    ctx.translate(-viewBox.x, -viewBox.y);

    // High quality blueprint drawing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.88;
    ctx.drawImage(blueprintImg, 0, 0);
    ctx.globalAlpha = 1.0;

    // Draw elements
    validElements.forEach(el => {
      let color = '#94a3b8';
      if (el.status === 'En proceso') color = '#f59e0b';
      if (el.status === 'Terminado') color = '#10b981';

      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(5, 7 / scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // High visibility red highlight ring around pipe
        const cx = (el.x + el.x2) / 2;
        const cy = (el.y + el.y2) / 2;
        const lineLength = Math.hypot(el.x2 - el.x, el.y2 - el.y);
        ctx.beginPath();
        ctx.arc(cx, cy, (lineLength / 2) + Math.max(16, 24 / scale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2.5, 3.5 / scale);
        ctx.stroke();

        // Label pill on canvas
        const labelText = `${el.label} (${el.meters || 0}m)`;
        const fontSize = Math.max(11, Math.round(13 / scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const pillPadX = 6 / scale;
        const pillPadY = 4 / scale;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.roundRect(
          cx - textWidth / 2 - pillPadX,
          cy - (28 / scale) - pillPadY,
          textWidth + pillPadX * 2,
          fontSize + pillPadY * 2,
          4 / scale
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy - (28 / scale) + fontSize / 2);

      } else if (el.type === 'camera') {
        const radius = Math.max(12, 14 / scale);
        
        // Red highlight ring around camera
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius + Math.max(10, 16 / scale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2.5, 3.5 / scale);
        ctx.stroke();

        // Camera circle
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, 2.5 / scale);
        ctx.stroke();

        // Label pill
        const labelText = el.label;
        const fontSize = Math.max(11, Math.round(13 / scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const pillPadX = 6 / scale;
        const pillPadY = 4 / scale;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.roundRect(
          el.x - textWidth / 2 - pillPadX,
          el.y - radius - (20 / scale) - pillPadY,
          textWidth + pillPadX * 2,
          fontSize + pillPadY * 2,
          4 / scale
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, el.x, el.y - radius - (20 / scale) + fontSize / 2);
      }
    });

    ctx.restore();
  }, [blueprintImg, elements, dimensions]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas 
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="block opacity-95"
      />
    </div>
  );
};
