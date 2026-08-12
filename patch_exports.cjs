const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

const replacement = `const handleExportMemoriasExcel = async () => {
    try {
      const excelJsMod = await import('exceljs');
      const ExcelJS = excelJsMod.default || excelJsMod;
      const fileSaverMod = await import('file-saver');
      const saveAs = fileSaverMod.saveAs || (fileSaverMod.default && fileSaverMod.default.saveAs) || fileSaverMod.default || (fileSaverMod as any).saveAs;
      
      const wb = new ExcelJS.Workbook();`;

content = content.replace(
  /const handleExportMemoriasExcel = async \(\) => \{\n\s*try \{\n\s*const ExcelJS = \(await import\('exceljs'\)\)\.default;\n\s*const \{ saveAs \} = \(await import\('file-saver'\)\)\.default \|\| await import\('file-saver'\);\n\s*const wb = new ExcelJS\.Workbook\(\);/,
  replacement
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched");
