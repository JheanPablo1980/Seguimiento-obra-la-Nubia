const fs = require('fs');
let content = fs.readFileSync('src/components/BlueprintCanvas.tsx', 'utf-8');

// Add onZoomChange to props
if (!content.includes('onZoomChange?:')) {
  content = content.replace(/zoomLevel: number;/g, "zoomLevel: number;\n  onZoomChange?: (zoom: number) => void;");
}
content = content.replace(/zoomLevel,\n\s+currentAreaPoints/g, "zoomLevel,\n  onZoomChange,\n  currentAreaPoints");

fs.writeFileSync('src/components/BlueprintCanvas.tsx', content);
