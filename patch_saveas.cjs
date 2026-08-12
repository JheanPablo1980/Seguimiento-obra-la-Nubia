const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /saveAs\(new Blob\(\[buffer\], \{ type: 'application\/octet-stream' \}\), fileName\);/g,
  `const finalSaveAs = typeof saveAs === 'function' ? saveAs : (saveAs as any).saveAs || (saveAs as any).default?.saveAs || (saveAs as any).default;
      finalSaveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched saveAs");
