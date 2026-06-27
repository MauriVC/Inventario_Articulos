const { fork } = require('child_process');
const path = require('path');
const os = require('os');

const backendPath = path.join(__dirname, '../inventario-backend/index.js');
const betterSqlite3Path = path.join(__dirname, 'node_modules/better-sqlite3');
const sqlitePath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventario-app', 'inventario_local.sqlite');

const child = fork(backendPath, [], {
  env: {
    ...process.env,
    DB_MODE: 'local',
    BETTER_SQLITE3_PATH: betterSqlite3Path,
    SQLITE_PATH: sqlitePath
  }
});

child.on('message', msg => console.log('Message:', msg));
child.on('error', err => console.error('Error:', err));
child.on('exit', code => console.log('Exit Code:', code));

setTimeout(() => child.kill(), 5000);
