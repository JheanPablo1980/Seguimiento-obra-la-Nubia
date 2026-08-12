const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

content = content.replace(
  /const htmlToImage = await import\('html-to-image'\);\n\s*const mapBase64 = await htmlToImage\.toPng/g,
  `const htmlToImageMod = await import('html-to-image');\n            const toPng = htmlToImageMod.toPng || (htmlToImageMod.default && htmlToImageMod.default.toPng);\n            const mapBase64 = await toPng`
);

content = content.replace(
  /const htmlToImage = await import\('html-to-image'\);\n\s*const photoBase64 = await htmlToImage\.toPng/g,
  `const htmlToImageMod = await import('html-to-image');\n            const toPng = htmlToImageMod.toPng || (htmlToImageMod.default && htmlToImageMod.default.toPng);\n            const photoBase64 = await toPng`
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
console.log("Patched html-to-image");
