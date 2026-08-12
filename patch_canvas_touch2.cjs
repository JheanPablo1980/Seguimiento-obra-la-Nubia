const fs = require('fs');
let content = fs.readFileSync('src/components/BlueprintCanvas.tsx', 'utf-8');

const pointerTrackingLogic = `
  const activePointers = useRef(new Map());
  const initialPinchDist = useRef(null);
  const initialZoomLevel = useRef(zoomLevel);

  const handlePointerDown = (e) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.target) e.target.setPointerCapture(e.pointerId);

    if (activePointers.current.size === 2) {
      setIsPanning(false); // Stop panning
      setIsDrawing(false); // Stop drawing
      
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchDist.current = dist;
      initialZoomLevel.current = zoomLevel;
      return;
    }

    if (activePointers.current.size === 1) {
      handleMouseDown(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      
      if (initialPinchDist.current && onZoomChange) {
        const zoomDelta = dist / initialPinchDist.current;
        let newZoom = initialZoomLevel.current * zoomDelta;
        newZoom = Math.min(Math.max(newZoom, 0.3), 4.0);
        onZoomChange(newZoom);
      }
      return;
    }

    if (activePointers.current.size === 1 || activePointers.current.size === 0) {
      handleMouseMove(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e) => {
    activePointers.current.delete(e.pointerId);
    if (e.target && e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    if (activePointers.current.size < 2) {
      initialPinchDist.current = null;
    }
    
    if (activePointers.current.size === 0) {
      handleMouseUp();
    }
  };

  const handlePointerCancel = (e) => {
    handlePointerUp(e);
  };
`;

content = content.replace(/const handleMouseDown = \(/, pointerTrackingLogic + "\n  const handleMouseDown = (");
content = content.replace(/onPointerDown=\{\(e\) => handleMouseDown\(e\.clientX, e\.clientY\)\}/, "onPointerDown={handlePointerDown}");
content = content.replace(/onPointerMove=\{\(e\) => handleMouseMove\(e\.clientX, e\.clientY\)\}/, "onPointerMove={handlePointerMove}");
content = content.replace(/onPointerUp=\{handleMouseUp\}/, "onPointerUp={handlePointerUp}");
content = content.replace(/onPointerCancel=\{handleMouseUp\}/, "onPointerCancel={handlePointerCancel}");

fs.writeFileSync('src/components/BlueprintCanvas.tsx', content);
