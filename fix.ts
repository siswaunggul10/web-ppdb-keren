import fs from 'fs';
const file = 'src/pages/AdminDashboard.tsx';
const lines = fs.readFileSync(file, 'utf-8').split('\n');
const newLines = [...lines.slice(0, 1022), ...lines.slice(1182)];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed duplicate panduan');
