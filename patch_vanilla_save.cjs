const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

// Remove import saveAs from 'file-saver';
content = content.replace(/import saveAs from 'file-saver';\n/, '');

// Replace saveAs(...) with vanilla JS in handleExportMemoriasExcel
content = content.replace(
  /const finalSaveAs =[^;]+;\n\s*finalSaveAs\(new Blob\(\[buffer\], \{ type: 'application\/octet-stream' \}\), fileName\);/g,
  `const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);`
);

// We should also replace the saveAs call in handleExportConsolidatedActasExcel if it's there!
content = content.replace(
  /saveAs\(new Blob\(\[buffer\], \{ type: 'application\/octet-stream' \}\), fileName\);/g,
  `const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched to vanilla save");
