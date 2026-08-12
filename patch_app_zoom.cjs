const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /zoomLevel=\{zoomLevel\}/g,
  "zoomLevel={zoomLevel}\n                  onZoomChange={setZoomLevel}"
);

fs.writeFileSync('src/App.tsx', content);
