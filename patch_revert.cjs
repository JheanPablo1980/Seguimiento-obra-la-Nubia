const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

// Revert ExcelJS and file-saver
content = content.replace(
  /const excelJsMod = await import\('exceljs'\);\n\s*const ExcelJS = excelJsMod\.default \|\| excelJsMod;\n\s*const fileSaverMod = await import\('file-saver'\);\n\s*const saveAs = fileSaverMod\.saveAs \|\| \(fileSaverMod\.default && fileSaverMod\.default\.saveAs\) \|\| fileSaverMod\.default \|\| \(fileSaverMod as any\)\.saveAs;/g,
  `const ExcelJS = (await import('exceljs')).default;\n      const { saveAs } = (await import('file-saver')).default || await import('file-saver');`
);

// Revert html-to-image
content = content.replace(
  /const htmlToImageMod = await import\('html-to-image'\);\n\s*const toPng = htmlToImageMod\.toPng \|\| \(htmlToImageMod\.default && htmlToImageMod\.default\.toPng\);\n\s*const mapBase64 = await toPng/g,
  `const { toPng } = await import('html-to-image');\n            const mapBase64 = await toPng`
);

content = content.replace(
  /const htmlToImageMod = await import\('html-to-image'\);\n\s*const toPng = htmlToImageMod\.toPng \|\| \(htmlToImageMod\.default && htmlToImageMod\.default\.toPng\);\n\s*const photoBase64 = await toPng/g,
  `const { toPng } = await import('html-to-image');\n            const photoBase64 = await toPng`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched back to original");
