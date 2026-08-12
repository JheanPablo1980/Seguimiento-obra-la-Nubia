const fs = require('fs');
let content = fs.readFileSync('src/components/BlueprintCanvas.tsx', 'utf-8');

// fix onZoomChange destructured prop
if (!content.includes('onZoomChange,\n  iconScale')) {
  content = content.replace(/zoomLevel,\n\s*iconScale/g, "zoomLevel,\n  onZoomChange,\n  iconScale");
}

// fix Typescript errors
content = content.replace(/const activePointers = useRef\(new Map\(\)\);/g, "const activePointers = useRef(new Map<number, {x: number, y: number}>());");
content = content.replace(/const initialPinchDist = useRef\(null\);/g, "const initialPinchDist = useRef<number | null>(null);");
content = content.replace(/const handlePointerDown = \(e\) => \{/g, "const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {");
content = content.replace(/const handlePointerMove = \(e\) => \{/g, "const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {");
content = content.replace(/const handlePointerUp = \(e\) => \{/g, "const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {");
content = content.replace(/const handlePointerCancel = \(e\) => \{/g, "const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {");

fs.writeFileSync('src/components/BlueprintCanvas.tsx', content);
