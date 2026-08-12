const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// For dashboard
content = content.replace(/<CollapsibleModule\n\s*id="meta"/g, "<CollapsibleModule\n        id=\"meta\"\n        hidden={!isDashboardTab}");
content = content.replace(/<CollapsibleModule\n\s*id="kpis"/g, "<CollapsibleModule\n          id=\"kpis\"\n          hidden={!isDashboardTab}");
content = content.replace(/<CollapsibleModule\n\s*id="charts"/g, "<CollapsibleModule\n          id=\"charts\"\n          hidden={!isDashboardTab}");

// For sectors
content = content.replace(/<CollapsibleModule\n\s*id="sectors"/g, "<CollapsibleModule\n          id=\"sectors\"\n          hidden={!isSectoresTab}");
content = content.replace(/<CollapsibleModule\n\s*id="summaryTable"/g, "<CollapsibleModule\n          id=\"summaryTable\"\n          hidden={!isSectoresTab}");

// For canvas
content = content.replace(/<CollapsibleModule\n\s*id="canvas"/g, "<CollapsibleModule\n            id=\"canvas\"\n            hidden={!isPlanosTab}");

// For bitacora
content = content.replace(/<CollapsibleModule\n\s*id="bitacora"/g, "<CollapsibleModule\n            id=\"bitacora\"\n            hidden={!isBitacoraTab}");

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx hidden props");
