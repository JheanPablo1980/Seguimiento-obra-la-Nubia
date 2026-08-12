const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /useEffect\(\(\) => \{\n\s*try \{ localStorage\.setItem\('obra_project_meta_v2', JSON\.stringify\(projectMeta\)\); \} catch \(e\) \{\}\n\s*supabaseProjectMeta\.saveMeta\(projectMeta\);\n\s*\}, \[projectMeta\]\);/,
  `useEffect(() => {
    try { localStorage.setItem('obra_project_meta_v2', JSON.stringify(projectMeta)); } catch (e) {}
    const t = setTimeout(() => supabaseProjectMeta.saveMeta(projectMeta), 2000);
    return () => clearTimeout(t);
  }, [projectMeta]);`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*try \{ localStorage\.setItem\('obra_areas_v2', JSON\.stringify\(areas\)\); \} catch \(e\) \{\}\n\s*supabaseAreas\.saveAreas\(areas\);\n\s*\}, \[areas\]\);/,
  `useEffect(() => {
    try { localStorage.setItem('obra_areas_v2', JSON.stringify(areas)); } catch (e) {}
    const t = setTimeout(() => supabaseAreas.saveAreas(areas), 2000);
    return () => clearTimeout(t);
  }, [areas]);`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*try \{ localStorage\.setItem\('obra_elements_v2', JSON\.stringify\(elements\)\); \} catch \(e\) \{\}\n\s*supabaseElements\.saveAllElements\(elements\);\n\s*\}, \[elements\]\);/,
  `useEffect(() => {
    try { localStorage.setItem('obra_elements_v2', JSON.stringify(elements)); } catch (e) {}
    const t = setTimeout(() => supabaseElements.saveAllElements(elements), 3000);
    return () => clearTimeout(t);
  }, [elements]);`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*try \{ localStorage\.setItem\('obra_schedule_items_v1', JSON\.stringify\(scheduleItems\)\); \} catch \(e\) \{\}\n\s*supabaseSchedule\.saveScheduleItems\(scheduleItems\);\n\s*\}, \[scheduleItems\]\);/,
  `useEffect(() => {
    try { localStorage.setItem('obra_schedule_items_v1', JSON.stringify(scheduleItems)); } catch (e) {}
    const t = setTimeout(() => supabaseSchedule.saveScheduleItems(scheduleItems), 3000);
    return () => clearTimeout(t);
  }, [scheduleItems]);`
);

fs.writeFileSync('src/App.tsx', content);
