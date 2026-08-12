const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace("import { saveAs } from 'file-saver';", "import saveAs from 'file-saver';");
content = content.replace("import { toPng } from 'html-to-image';", "import * as htmlToImage from 'html-to-image';");

// And replace `toPng(` with `htmlToImage.toPng(`
content = content.replace(/await toPng\(/g, "await htmlToImage.toPng(");

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched imports");
