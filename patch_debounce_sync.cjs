const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const t = setTimeout\(\(\) => supabaseProjectMeta\.saveMeta\(projectMeta\), 2000\);/g,
  `setSyncStatus('syncing');\n    const t = setTimeout(() => { supabaseProjectMeta.saveMeta(projectMeta).then(() => setSyncStatus(navigator.onLine ? 'synced' : 'offline')); }, 2000);`
);

content = content.replace(
  /const t = setTimeout\(\(\) => supabaseAreas\.saveAreas\(areas\), 2000\);/g,
  `setSyncStatus('syncing');\n    const t = setTimeout(() => { supabaseAreas.saveAreas(areas).then(() => setSyncStatus(navigator.onLine ? 'synced' : 'offline')); }, 2000);`
);

content = content.replace(
  /const t = setTimeout\(\(\) => supabaseElements\.saveAllElements\(elements\), 3000\);/g,
  `setSyncStatus('syncing');\n    const t = setTimeout(() => { supabaseElements.saveAllElements(elements).then(() => setSyncStatus(navigator.onLine ? 'synced' : 'offline')); }, 3000);`
);

content = content.replace(
  /const t = setTimeout\(\(\) => supabaseSchedule\.saveScheduleItems\(scheduleItems\), 3000\);/g,
  `setSyncStatus('syncing');\n    const t = setTimeout(() => { supabaseSchedule.saveScheduleItems(scheduleItems).then(() => setSyncStatus(navigator.onLine ? 'synced' : 'offline')); }, 3000);`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched sync status debounces");
