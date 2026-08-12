const fs = require('fs');
let content = fs.readFileSync('src/components/BlueprintCanvas.tsx', 'utf-8');

// Replace mouse events with pointer events
content = content.replace(/onMouseDown=\{(.*?)\}/g, "onPointerDown={$1}");
content = content.replace(/onMouseMove=\{(.*?)\}/g, "onPointerMove={$1}");
content = content.replace(/onMouseUp=\{handleMouseUp\}/g, "onPointerUp={handleMouseUp} onPointerCancel={handleMouseUp}");
content = content.replace(/onMouseLeave=\{(.*?)\}/g, "onPointerLeave={$1}");

// Add touch-action: none to canvas to prevent browser scrolling when drawing
content = content.replace(/<canvas\n\s+ref=\{canvasRef\}/g, `<canvas\n        ref={canvasRef}\n        style={{ touchAction: 'none' }}`);

fs.writeFileSync('src/components/BlueprintCanvas.tsx', content);
console.log("Canvas patched for pointer events");
