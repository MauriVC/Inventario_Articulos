const { execSync } = require('child_process');

if (process.env.RENDER || process.env.CI) {
  console.log('postinstall: CI/Render detectado, se omite electron-rebuild (no necesario en despliegue web)');
  process.exit(0);
}

console.log('postinstall: recompilando better-sqlite3 para Electron (dev local)...');
execSync('pnpm run rebuild-sqlite-app', { stdio: 'inherit' });
