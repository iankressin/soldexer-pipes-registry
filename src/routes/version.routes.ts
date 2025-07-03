import type { FastifyInstance } from 'fastify'
import { VersionController } from '../controllers/version.controller'

export async function versionRoutes(fastify: FastifyInstance) {
	const versionController = new VersionController()

	// Bind controller methods to preserve 'this' context
	const createVersion = versionController.createVersion.bind(versionController)
	const getVersionById = versionController.getVersionById.bind(versionController)
	const getVersions = versionController.getVersions.bind(versionController)
	const updateVersion = versionController.updateVersion.bind(versionController)
	const deleteVersion = versionController.deleteVersion.bind(versionController)
	const getEnvSchema = versionController.getEnvSchema.bind(versionController)

	// Version CRUD routes
	fastify.post('/versions', createVersion)
	fastify.get('/versions', getVersions)
	fastify.get('/versions/:id', getVersionById)
	fastify.put('/versions/:id', updateVersion)
	fastify.delete('/versions/:id', deleteVersion)

	// Health check route for version service
	fastify.get('/versions/health', async (request, reply) => {
		return reply.send({
			success: true,
			message: 'Version service is healthy',
			timestamp: new Date().toISOString(),
		})
	})

	fastify.get('/versions/:name/env-schema/:version', getEnvSchema)
}
