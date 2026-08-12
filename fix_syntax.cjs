const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');
content = content.replace(/\} as any\n            \}\);/g, "} as any);");
fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
