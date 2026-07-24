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
  let content = fs.readFileSync(file, 'utf8');
  if (content.startsWith("export const dynamic = 'force-dynamic';\n")) {
    content = content.replace("export const dynamic = 'force-dynamic';\n", "");
    if (content.startsWith('"use client";')) {
      content = `"use client";\nexport const dynamic = 'force-dynamic';\n` + content.replace('"use client";', '').trimStart();
    } else {
      content = `export const dynamic = 'force-dynamic';\n` + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed order in ${file}`);
  }
});
console.log('Done fixing order.');
