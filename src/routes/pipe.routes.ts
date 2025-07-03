import type { FastifyInstance } from 'fastify'
import { PipeController } from '../controllers/pipe.controller'
import { VersionController } from '../controllers/version.controller'

export async function pipeRoutes(fastify: FastifyInstance) {
	const pipeController = new PipeController()
	const versionController = new VersionController()

	// Bind controller methods to preserve 'this' context
	const createPipe = pipeController.createPipe.bind(pipeController)
	const getPipeById = pipeController.getPipeById.bind(pipeController)
	const getPipes = pipeController.getPipes.bind(pipeController)
	const updatePipe = pipeController.updatePipe.bind(pipeController)
	const deletePipe = pipeController.deletePipe.bind(pipeController)
	const downloadPipe = pipeController.downloadPipe.bind(pipeController)

	const getVersionsByPipeId = versionController.getVersionsByPipeId.bind(versionController)
	const getLatestVersionByPipeId = versionController.getLatestVersionByPipeId.bind(versionController)

	// Pipe CRUD routes
	fastify.post('/pipes', createPipe)
	fastify.get('/pipes', getPipes)

	// Download routes (must be before generic /:id routes to avoid conflicts)
	fastify.get('/pipes/:name/download', downloadPipe)
	fastify.get('/pipes/:name/download/:version', downloadPipe)

	fastify.get('/pipes/:id', getPipeById)
	fastify.put('/pipes/:id', updatePipe)
	fastify.delete('/pipes/:id', deletePipe)

	// Pipe-specific version routes
	fastify.get('/pipes/:pipeId/versions', getVersionsByPipeId)
	fastify.get('/pipes/:pipeId/versions/latest', getLatestVersionByPipeId)

	// Health check route for pipe service
	fastify.get('/pipes/health', async (request, reply) => {
		return reply.send({
			success: true,
			message: 'Pipe service is healthy',
			timestamp: new Date().toISOString(),
		})
	})
}
