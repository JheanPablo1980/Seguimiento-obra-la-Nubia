const fs = require('fs');
let content = fs.readFileSync('src/components/BlueprintCanvas.tsx', 'utf-8');

content = content.replace(/const pts = Array\.from\(activePointers\.current\.values\(\)\);/g, "const pts = Array.from(activePointers.current.values()) as any[];");

fs.writeFileSync('src/components/BlueprintCanvas.tsx', content);
