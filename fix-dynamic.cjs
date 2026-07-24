const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('page.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const pages = walk('app');
pages.forEach(file => {
  if (file === path.normalize('app/page.tsx')) return;
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const dynamic')) {
    const updated = `export const dynamic = 'force-dynamic';\n` + content;
    fs.writeFileSync(file, updated, 'utf8');
    console.log(`Added force-dynamic to ${file}`);
  }
});
console.log('Done updating pages.');
