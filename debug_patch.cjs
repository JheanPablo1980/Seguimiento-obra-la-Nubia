const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /const handleExportMemoriasExcel = async \(\) => \{\n\s*try \{/g,
  `const handleExportMemoriasExcel = async () => {
    alert("Iniciando exportación...");
    try {
      console.log("Starting excel export...");`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched debug alert");
