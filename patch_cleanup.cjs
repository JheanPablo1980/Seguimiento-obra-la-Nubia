const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /alert\("Iniciando exportación\.\.\."\);\n\s*try \{\n\s*console\.log\("Starting excel export\.\.\."\);/g,
  `try {`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Cleaned up");
