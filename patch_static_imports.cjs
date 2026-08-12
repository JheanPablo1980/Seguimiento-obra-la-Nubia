const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

// Add static imports at the top
if (!content.includes("import ExcelJS from 'exceljs';")) {
  content = content.replace(
    /import React, \{ useState, useMemo \} from 'react';/,
    `import React, { useState, useMemo } from 'react';\nimport ExcelJS from 'exceljs';\nimport { saveAs } from 'file-saver';\nimport { toPng } from 'html-to-image';`
  );
}

// Remove dynamic imports from handleExportMemoriasExcel
content = content.replace(
  /const handleExportMemoriasExcel = async \(\) => \{\n\s*try \{\n\s*const ExcelJS = \(await import\('exceljs'\)\)\.default;\n\s*const \{ saveAs \} = \(await import\('file-saver'\)\)\.default \|\| await import\('file-saver'\);\n\s*const wb = new ExcelJS\.Workbook\(\);/,
  `const handleExportMemoriasExcel = async () => {\n    try {\n      const wb = new ExcelJS.Workbook();`
);

// Remove dynamic imports from html-to-image (map)
content = content.replace(
  /const \{ toPng \} = await import\('html-to-image'\);\n\s*const mapBase64 = await toPng\(mapEl, \{ pixelRatio: 1\.5 \}\);/g,
  `const mapBase64 = await toPng(mapEl, { pixelRatio: 1.5 });`
);

// Remove dynamic imports from html-to-image (photo)
content = content.replace(
  /const \{ toPng \} = await import\('html-to-image'\);\n\s*const photoBase64 = await toPng\(photoEl, \{ pixelRatio: 1\.5 \}\);/g,
  `const photoBase64 = await toPng(photoEl, { pixelRatio: 1.5 });`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched to static imports");
