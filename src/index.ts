import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { pipeRoutes } from './routes/pipe.routes'
import { versionRoutes } from './routes/version.routes'
import { logger } from './utils/logger'

const fastify = Fastify({
	logger: false, // Using our custom logger instead
})

// Register multipart plugin for file uploads
fastify.register(multipart, {
	limits: {
		fileSize: 1000 * 1024 * 1024, // 1GB
	},
})

// Register static file serving for uploaded files
fastify.register(import('@fastify/static'), {
	root: process.env.STORAGE_DIR || '/Users/ianguimaraes/Projects/sqd/spm',
	prefix: '/files/',
})

// Register routes
fastify.register(pipeRoutes)
fastify.register(versionRoutes)

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
	logger.error('Global error handler:', error)

	reply.status(500).send({
		error: 'Internal Server Error',
		message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
	})
})

// Health check route
fastify.get('/', async (request, reply) => {
	return reply.send({
		message: 'SPM API is running',
		version: '1.0.0',
		timestamp: new Date().toISOString(),
	})
})

// Start server
const start = async () => {
	try {
		const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
		const host = process.env.HOST || '0.0.0.0'

		await fastify.listen({ port, host })
		logger.info(`Server running at http://${host}:${port}`)
	} catch (error) {
		logger.error('Error starting server:', error)
		console.log(error)
		process.exit(1)
	}
}

start()
