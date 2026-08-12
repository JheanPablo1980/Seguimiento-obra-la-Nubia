const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /\} catch \(err\) \{\n\s*console\.error\("Error exporting to Excel", err\);\n\s*alert\("Error al exportar Excel"\);\n\s*\}/g,
  `} catch (err: any) {
      console.error("Error exporting to Excel", err);
      alert("Error al exportar Excel: " + (err.message || err));
    }`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched");
