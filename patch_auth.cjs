const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const isAdmin = lowerEmail === ADMIN_EMAIL\.toLowerCase\(\) \|\| user\.role === 'admin' \|\| lowerEmail\.includes\('admin'\);/,
  "const isAdmin = lowerEmail === ADMIN_EMAIL.toLowerCase() || user.role === 'admin';"
);

fs.writeFileSync('src/App.tsx', content);
