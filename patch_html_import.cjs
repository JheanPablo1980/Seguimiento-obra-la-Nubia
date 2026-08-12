const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /import \* as htmlToImage from 'html-to-image';/g,
  "import { toPng } from 'html-to-image';"
);

content = content.replace(
  /await htmlToImage\.toPng\(/g,
  "await toPng("
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched toPng import");
