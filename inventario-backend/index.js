require('dotenv').config(); // Carga las variables del archivo .env
const fastify = require('fastify')({ logger: true });
const { createClient } = require('@supabase/supabase-js');

// Inicializar la conexión con Supabase usando las llaves seguras
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta de prueba
fastify.get('/', async (request, reply) => {
    return {
        mensaje: '¡El servidor funciona!',
        supabase_conectado: supabaseUrl ? 'Sí' : 'No'
    };
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        fastify.log.info(`Servidor conectado exitosamente a Supabase en: ${supabaseUrl}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();