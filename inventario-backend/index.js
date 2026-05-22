require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const mysql = require('mysql2/promise'); // Librería para MySQL

// Crear la conexión (pool) a la base de datos
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false } // Aiven requiere conexión segura
});

// Ruta de prueba para ver si la BD responde
fastify.get('/test-db', async (request, reply) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS resultado');
        return { status: 'Conexión exitosa', data: rows };
    } catch (err) {
        return { status: 'Error de conexión', error: err.message };
    }
});

// Iniciar servidor
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Servidor escuchando en http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();