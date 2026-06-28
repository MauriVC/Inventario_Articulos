const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function setupDatabase() {
  console.log('Iniciando configuración de la base de datos en Aiven...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      multipleStatements: true // Permite ejecutar todo el archivo .sql de una vez
    });

    console.log('Conexión exitosa. Leyendo archivo schema.sql...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Ejecutando script SQL...');
    await connection.query(schemaSql);

    console.log('¡Base de datos configurada correctamente! Ya se crearon todas las tablas y el usuario administrador por defecto.');
    await connection.end();
  } catch (error) {
    console.error('Error al configurar la base de datos:', error.message);
  }
}

setupDatabase();
