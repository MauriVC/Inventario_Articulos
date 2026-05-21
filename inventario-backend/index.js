const fastify = require('fastify')({ logger: true })

fastify.get('/', async (request, reply) => {
    return { mensaje: '¡El servidor de Inventario funciona perfectamente!' }
})

const start = async () => {
    try {
        // Escuchamos en 0.0.0.0 para que Docker pueda exponer el puerto hacia tu computadora
        await fastify.listen({ port: 3000, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()