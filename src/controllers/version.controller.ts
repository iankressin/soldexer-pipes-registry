import type { FastifyRequest, FastifyReply } from 'fastify'
import { VersionService } from '../services/version.service'
import type { CreateVersionDTO, UpdateVersionDTO, VersionQueryOptions } from '../types/version'
import { logger } from '../utils/logger'
import { PipeService } from '../services/pipe.service'

export class VersionController {
	private versionService: VersionService
	private pipeService: PipeService

	constructor() {
		this.versionService = new VersionService()
		this.pipeService = new PipeService()
	}

	/**
	 * Create a new version
	 * POST /versions
	 */
	async createVersion(
		request: FastifyRequest<{
			Body: CreateVersionDTO
		}>,
		reply: FastifyReply,
	) {
		try {
			const versionData = request.body

			// Basic validation
			if (!versionData.pipeId || !versionData.versionNumber || !versionData.assetUrl) {
				return reply.status(400).send({
					error: 'Missing required fields: pipeId, versionNumber, assetUrl',
				})
			}

			const version = await this.versionService.createVersion(versionData)

			return reply.status(201).send({
				success: true,
				data: version,
				message: 'Version created successfully',
			})
		} catch (error) {
			logger.error('Error in createVersion controller:', error)

			if (error instanceof Error && error.message === 'Pipe not found') {
				return reply.status(404).send({
					error: error.message,
				})
			}

			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get version by ID
	 * GET /versions/:id
	 */
	async getVersionById(
		request: FastifyRequest<{
			Params: { id: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const versionId = parseInt(request.params.id)

			if (Number.isNaN(versionId)) {
				return reply.status(400).send({
					error: 'Invalid version ID',
				})
			}

			const version = await this.versionService.getVersionById(versionId)

			if (!version) {
				return reply.status(404).send({
					error: 'Version not found',
				})
			}

			return reply.send({
				success: true,
				data: version,
			})
		} catch (error) {
			logger.error('Error in getVersionById controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get versions with pagination and filtering
	 * GET /versions
	 */
	async getVersions(
		request: FastifyRequest<{
			Querystring: {
				page?: string
				limit?: string
				pipeId?: string
			}
		}>,
		reply: FastifyReply,
	) {
		try {
			const { page, limit, pipeId } = request.query

			const options: VersionQueryOptions = {
				page: page ? parseInt(page) : undefined,
				limit: limit ? parseInt(limit) : undefined,
				pipeId: pipeId ? parseInt(pipeId) : undefined,
			}

			const result = await this.versionService.getVersions(options)

			return reply.send({
				success: true,
				data: result,
			})
		} catch (error) {
			logger.error('Error in getVersions controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get versions by pipe ID
	 * GET /pipes/:pipeId/versions
	 */
	async getVersionsByPipeId(
		request: FastifyRequest<{
			Params: { pipeId: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const pipeId = parseInt(request.params.pipeId)

			if (Number.isNaN(pipeId)) {
				return reply.status(400).send({
					error: 'Invalid pipe ID',
				})
			}

			const versions = await this.versionService.getVersionsByPipeId(pipeId)

			return reply.send({
				success: true,
				data: versions,
			})
		} catch (error) {
			logger.error('Error in getVersionsByPipeId controller:', error)

			if (error instanceof Error && error.message === 'Pipe not found') {
				return reply.status(404).send({
					error: error.message,
				})
			}

			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get latest version for a pipe
	 * GET /pipes/:pipeId/versions/latest
	 */
	async getLatestVersionByPipeId(
		request: FastifyRequest<{
			Params: { pipeId: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const pipeId = parseInt(request.params.pipeId)

			if (Number.isNaN(pipeId)) {
				return reply.status(400).send({
					error: 'Invalid pipe ID',
				})
			}

			const version = await this.versionService.getLatestVersionByPipeId(pipeId)

			if (!version) {
				return reply.status(404).send({
					error: 'No versions found for this pipe',
				})
			}

			return reply.send({
				success: true,
				data: version,
			})
		} catch (error) {
			logger.error('Error in getLatestVersionByPipeId controller:', error)

			if (error instanceof Error && error.message === 'Pipe not found') {
				return reply.status(404).send({
					error: error.message,
				})
			}

			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Update version
	 * PUT /versions/:id
	 */
	async updateVersion(
		request: FastifyRequest<{
			Params: { id: string }
			Body: UpdateVersionDTO
		}>,
		reply: FastifyReply,
	) {
		try {
			const versionId = parseInt(request.params.id)

			if (Number.isNaN(versionId)) {
				return reply.status(400).send({
					error: 'Invalid version ID',
				})
			}

			const updateData = request.body
			const version = await this.versionService.updateVersion(versionId, updateData)

			if (!version) {
				return reply.status(404).send({
					error: 'Version not found',
				})
			}

			return reply.send({
				success: true,
				data: version,
				message: 'Version updated successfully',
			})
		} catch (error) {
			logger.error('Error in updateVersion controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Delete version
	 * DELETE /versions/:id
	 */
	async deleteVersion(
		request: FastifyRequest<{
			Params: { id: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const versionId = parseInt(request.params.id)

			if (Number.isNaN(versionId)) {
				return reply.status(400).send({
					error: 'Invalid version ID',
				})
			}

			const deleted = await this.versionService.deleteVersion(versionId)

			if (!deleted) {
				return reply.status(404).send({
					error: 'Version not found',
				})
			}

			return reply.status(204).send()
		} catch (error) {
			logger.error('Error in deleteVersion controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	async getEnvSchema(
		request: FastifyRequest<{
			Params: { name: string; version: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const { name, version: versionNumber } = request.params

			console.log('name', name)
			console.log('versionNumber', versionNumber)

			const pipe = await this.pipeService.getPipeByName(name)

			if (!pipe) {
				return reply.status(404).send({
					error: 'Pipe not found',
				})
			}

			const version = await this.versionService.getVersionByPipeIdAndVersionNumber(pipe.id, versionNumber)

			if (!version) {
				return reply.status(404).send({
					error: 'Version not found',
				})
			}

			return reply.send({
				success: true,
				data: version.envSchema,
			})
		} catch (error) {
			logger.error('Error in getEnvSchema controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}
}
