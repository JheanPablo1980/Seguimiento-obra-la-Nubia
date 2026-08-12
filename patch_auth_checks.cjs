const fs = require('fs');

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/\|\|\s*[a-zA-Z0-9_\.\?]+\.includes\('admin'\)/g, "");
  fs.writeFileSync(filePath, content);
}

cleanFile('src/components/AuthModal.tsx');
cleanFile('src/lib/supabase.ts');
cleanFile('src/App.tsx');

console.log("Patched auth checks");
