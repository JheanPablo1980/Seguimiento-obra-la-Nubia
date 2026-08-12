const fs = require('fs');
let content = fs.readFileSync('src/components/CollapsibleModule.tsx', 'utf-8');

content = content.replace(/headerBgClass\?: string;\n\}/, "headerBgClass?: string;\n  hidden?: boolean;\n}");
content = content.replace(/headerBgClass = 'bg-white'\n\}\) => \{/, "headerBgClass = 'bg-white',\n  hidden = false\n}) => {\n  if (hidden) return null;");

fs.writeFileSync('src/components/CollapsibleModule.tsx', content);
console.log("Patched CollapsibleModule");
