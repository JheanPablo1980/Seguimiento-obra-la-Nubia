const fs = require('fs');
let content = fs.readFileSync('src/components/BitacoraTable.tsx', 'utf-8');

// Add inputMode to progressPercent
content = content.replace(/type="number"\n\s*min="0"\n\s*max="100"\n\s*value=\{el\.progressPercent \|\| 0\}/, 'type="number"\n                                inputMode="numeric"\n                                min="0"\n                                max="100"\n                                value={el.progressPercent || 0}');

fs.writeFileSync('src/components/BitacoraTable.tsx', content);
