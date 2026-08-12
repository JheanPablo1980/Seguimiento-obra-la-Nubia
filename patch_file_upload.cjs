const fs = require('fs');

let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const anchor = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;`;

const repl = `  const handleFileUpload = (file: File) => {`;

content = content.replace(anchor, repl);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
