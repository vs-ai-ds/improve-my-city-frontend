import { globby } from 'globby';
import fs from 'node:fs';

const files = await globby(['src/**/*.{ts,tsx}', '!src/**/__tests__/**']);
const graph = new Map(files.map(f=>[f, new Set()]));
for (const f of files) {
  const s = fs.readFileSync(f,'utf8');
  const rx = /from\s+['"](.+?)['"]/g; let m;
  while ((m = rx.exec(s))) {
    let p = m[1];
    if (p.startsWith('.')) {
      let resolved = (p.endsWith('.ts')||p.endsWith('.tsx')) ? p : p + '.tsx';
      let full = new URL(resolved, new URL('file:///'+f)).pathname.replace(/^\//,'');
      if (graph.has(full)) graph.get(f).add(full);
    }
  }
}
const visited = new Set();
function dfs(f){ if(visited.has(f)) return; visited.add(f); for(const n of (graph.get(f)||[])) dfs(n); }
['src/main.tsx','src/App.tsx','src/pages/HomePage.tsx'].forEach(f=>{ if (graph.has(f)) dfs(f); });
const dead = files.filter(f=>!visited.has(f));
console.log('\nPossibly unused files (heuristic)');
console.log(dead.join('\n'));