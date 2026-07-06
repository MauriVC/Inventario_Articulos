require('dotenv').config();
const {pool} = require('./src/config/database');

async function migrate() {
  try {
    await pool.query('ALTER TABLE categorias ADD CONSTRAINT uq_nombre UNIQUE (nombre)');
    console.log('Unique constraint added to categorias');
    
    await pool.query('ALTER TABLE marcas ADD CONSTRAINT uq_nombre UNIQUE (nombre)');
    console.log('Unique constraint added to marcas');
    
    await pool.query('ALTER TABLE unidad_medidas ADD CONSTRAINT uq_nombre UNIQUE (nombre)');
    console.log('Unique constraint added to unidad_medidas');
    
    await pool.query('ALTER TABLE colores ADD CONSTRAINT uq_nombre UNIQUE (nombre)');
    console.log('Unique constraint added to colores');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
