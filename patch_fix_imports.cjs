const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

if (!content.includes("import ExcelJS from 'exceljs';")) {
  content = content.replace(
    /import React,[^;]+;/,
    `$&
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';`
  );
}
fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Imports added");
