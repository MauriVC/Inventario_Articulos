require('dotenv').config();
const {pool} = require('./src/config/database');

async function checkDuplicates() {
  const tables = ['categorias', 'marcas', 'unidad_medidas', 'colores', 'atributos'];
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT nombre, COUNT(*) as count FROM ${table} GROUP BY nombre HAVING count > 1`);
    if (rows.length > 0) {
      console.log(`Duplicates in ${table}:`, rows);
    } else {
      console.log(`No duplicates in ${table}`);
    }
  }
  process.exit(0);
}

checkDuplicates();
