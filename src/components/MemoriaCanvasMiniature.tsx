import React, { useRef, useEffect, useState, useCallback } from 'react';
import { InspectionElement } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface MemoriaCanvasMiniatureProps {
  blueprintImg: HTMLImageElement | null;
  elements: InspectionElement[];
}

export const MemoriaCanvasMiniature: React.FC<MemoriaCanvasMiniatureProps> = ({ blueprintImg, elements }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 400 });
  const [userZoom, setUserZoom] = useState<number>(1.0);
  const [userPan, setUserPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Reset user zoom and pan when elements change
  useEffect(() => {
    setUserZoom(1.0);
    setUserPan({ x: 0, y: 0 });
  }, [elements]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...userPan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setUserPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserZoom(z => Math.min(z * 1.3, 4.0));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserZoom(z => Math.max(z / 1.3, 0.4));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserZoom(1.0);
    setUserPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (dimensions.width === 0 || dimensions.height === 0) return;

    // Ultra High-DPI buffer (3x pixel density) for razor-sharp CAD & blueprint text
    const dpr = 3;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgWidth = blueprintImg && blueprintImg.width > 0 ? blueprintImg.width : 2000;
    const imgHeight = blueprintImg && blueprintImg.height > 0 ? blueprintImg.height : 1200;

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

      const spanX = Math.max(maxX - minX, 40);
      const spanY = Math.max(maxY - minY, 40);

      // Smart dynamic padding tailored to element scale
      const padX = Math.max(80, Math.min(spanX * 0.5, 300));
      const padY = Math.max(80, Math.min(spanY * 0.5, 300));

      let boxX = Math.max(0, minX - padX);
      let boxY = Math.max(0, minY - padY);
      let boxW = Math.min(imgWidth - boxX, spanX + padX * 2);
      let boxH = Math.min(imgHeight - boxY, spanY + padY * 2);

      // Maintain reasonable minimum dimension for clear architectural context
      const minBoxW = Math.max(220, Math.min(imgWidth * 0.4, 600));
      const minBoxH = Math.max(160, Math.min(imgHeight * 0.4, 450));

      if (boxW < minBoxW) {
        const diff = minBoxW - boxW;
        boxX = Math.max(0, boxX - diff / 2);
        boxW = Math.min(imgWidth - boxX, minBoxW);
      }
      if (boxH < minBoxH) {
        const diff = minBoxH - boxH;
        boxY = Math.max(0, boxY - diff / 2);
        boxH = Math.min(imgHeight - boxY, minBoxH);
      }

      viewBox = { x: boxX, y: boxY, width: boxW, height: boxH };
    }

    const baseScale = Math.min(dimensions.width / viewBox.width, dimensions.height / viewBox.height);
    const finalScale = baseScale * userZoom;

    // Background fill
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    
    // Center the viewBox in the canvas with user pan offset
    const dx = (dimensions.width - viewBox.width * finalScale) / 2 + userPan.x;
    const dy = (dimensions.height - viewBox.height * finalScale) / 2 + userPan.y;

    ctx.translate(dx, dy);
    ctx.scale(finalScale, finalScale);
    ctx.translate(-viewBox.x, -viewBox.y);

    // High quality blueprint drawing at 100% full crispness
    if (blueprintImg && blueprintImg.complete && blueprintImg.width > 0) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(blueprintImg, 0, 0);
    } else {
      // Clean architectural blueprint grid if no image loaded
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(viewBox.x - 500, viewBox.y - 500, viewBox.width + 1000, viewBox.height + 1000);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < imgWidth; gx += 50) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, imgHeight); ctx.stroke();
      }
      for (let gy = 0; gy < imgHeight; gy += 50) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(imgWidth, gy); ctx.stroke();
      }
    }

    // Draw elements with high-contrast outlines and clear badges
    validElements.forEach(el => {
      let color = '#94a3b8';
      if (el.status === 'En proceso') color = '#f59e0b';
      if (el.status === 'Terminado') color = '#10b981';

      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        const cx = (el.x + el.x2) / 2;
        const cy = (el.y + el.y2) / 2;
        const lineLength = Math.hypot(el.x2 - el.x, el.y2 - el.y);

        // 1. Red highlight inspection area ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, (lineLength / 2) + Math.max(20, 26 / finalScale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2.5, 3.5 / finalScale);
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // 2. Dark casing for pipe for ultra high contrast against light or dark CAD plans
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(8, 10 / finalScale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 3. Colored pipe body
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(5, 6.5 / finalScale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Label pill on canvas
        const labelText = `${el.label} (${el.meters || 0}m)`;
        const fontSize = Math.max(11, Math.round(13 / finalScale));
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const pillPadX = Math.max(6, 7 / finalScale);
        const pillPadY = Math.max(4, 5 / finalScale);
        const badgeOffsetY = Math.max(28, 32 / finalScale);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, 1.8 / finalScale);
        ctx.beginPath();
        ctx.roundRect(
          cx - textWidth / 2 - pillPadX,
          cy - badgeOffsetY - pillPadY,
          textWidth + pillPadX * 2,
          fontSize + pillPadY * 2,
          Math.max(4, 5 / finalScale)
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy - badgeOffsetY + fontSize / 2);

      } else if (el.type === 'camera') {
        const radius = Math.max(12, 14 / finalScale);
        
        // 1. Red highlight inspection area ring around camera
        ctx.save();
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius + Math.max(14, 18 / finalScale), 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2.5, 3.5 / finalScale);
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // 2. Camera outer dark casing
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius + 2 / finalScale, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // 3. Camera circle body
        ctx.beginPath();
        ctx.arc(el.x, el.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, 2.5 / finalScale);
        ctx.stroke();

        // 4. Camera Norm indicator (MT, BT, D)
        const camTypeUpper = (el.camType || '').toUpperCase();
        let normStr = '';
        if (camTypeUpper.includes('MT')) normStr = 'MT';
        else if (camTypeUpper.includes('D')) normStr = 'D';
        else if (camTypeUpper.includes('BT')) normStr = 'BT';

        if (normStr) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, Math.round(9 / finalScale))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(normStr, el.x, el.y);
        }

        // 5. Label pill
        const labelText = el.label;
        const fontSize = Math.max(11, Math.round(13 / finalScale));
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const pillPadX = Math.max(6, 7 / finalScale);
        const pillPadY = Math.max(4, 5 / finalScale);
        const badgeOffsetY = radius + Math.max(20, 24 / finalScale);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, 1.8 / finalScale);
        ctx.beginPath();
        ctx.roundRect(
          el.x - textWidth / 2 - pillPadX,
          el.y - badgeOffsetY - pillPadY,
          textWidth + pillPadX * 2,
          fontSize + pillPadY * 2,
          Math.max(4, 5 / finalScale)
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, el.x, el.y - badgeOffsetY + fontSize / 2);
      }
    });

    ctx.restore();
  }, [blueprintImg, elements, dimensions, userZoom, userPan]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas 
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="block opacity-95"
      />

      {/* Floating Zoom & Framing Controls */}
      <div 
        className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg p-1 shadow-lg z-20 print:hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Acercar plano (Zoom In)"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Alejar plano (Zoom Out)"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          title="Centrar y reajustar encuadre"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-bold text-slate-400 px-1 border-l border-slate-700">
          {Math.round(userZoom * 100)}%
        </span>
      </div>
    </div>
  );
};

