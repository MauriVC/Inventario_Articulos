/**
 * Script de prueba para verificar conexión a Aiven MySQL
 * Ejecutar: node test-aiven.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAiven() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Probando conexión a Aiven MySQL...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  DB:   ${process.env.DB_NAME}`);
  console.log(`  SSL:  ${process.env.DB_SSL}`);
  console.log('');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT),
      ssl: { rejectUnauthorized: false }
    });

    console.log('  ✅ Conexión exitosa a Aiven MySQL!');

    // Verificar tablas
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n  📋 Tablas encontradas (${tables.length}):`);
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log(`     • ${tableName}`);
    });

    // Verificar que la tabla usuarios existe y tiene datos
    const [users] = await connection.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`\n  👤 Usuarios registrados: ${users[0].total}`);

    await connection.end();
    console.log('\n  ✅ Todo listo. Tu backend puede conectarse a Aiven.\n');
  } catch (err) {
    console.error(`\n  ❌ Error de conexión: ${err.message}\n`);
    if (err.message.includes('Access denied')) {
      console.log('  💡 Verifica usuario/contraseña en el .env');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.log('  💡 Verifica host/puerto y que tengas internet');
    }
    process.exit(1);
  }
}

testAiven();
