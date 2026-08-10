const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appMatches = fs.globSync(
  'node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
  { cwd: root }
);
const dest = appMatches[0] ? path.join(root, appMatches[0]) : null;
const src = path.join(root, '..', 'inventario-backend', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');

if (!dest) {
  console.log('sync-sqlite-app: no se encontro el modulo de better-sqlite3 en el app, se omite la copia');
  process.exit(0);
}
if (!fs.existsSync(src)) {
  console.log('sync-sqlite-app: no existe el binario del backend (' + src + '), se omite la copia');
  process.exit(0);
}

const tmp = dest + '.tmp';
fs.copyFileSync(src, tmp);
fs.rmSync(dest, { force: true });
fs.copyFileSync(tmp, dest);
fs.rmSync(tmp, { force: true });
console.log('sync-sqlite-app: binario del app reemplazado por copia real (vinculo roto)');
