import type { FastifyRequest, FastifyReply } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import type { UpdatePipeDTO, PipeQueryOptions, CreatePipeWithFileDTO } from '../types/pipe'
import { PipeService } from '../services/pipe.service'
import { logger } from '../utils/logger'

export class PipeController {
	private pipeService: PipeService

	constructor() {
		this.pipeService = new PipeService()
	}

	/**
	 * Create a new pipe with file upload
	 * POST /pipes (multipart/form-data)
	 */
	async createPipe(request: FastifyRequest, reply: FastifyReply) {
		try {
			// Use the working approach: request.file() handles both file and fields properly
			const data = await request.file()

			if (!data) {
				return reply.status(400).send({
					error: 'No file uploaded',
				})
			}

			// Extract form fields from multipart data
			const fields = data.fields
			const name = fields.name?.value
			const version = fields.version?.value
			const description = fields.description?.value
			const envSchema = fields.envSchema?.value

			// Validate required fields
			if (!name) {
				return reply.status(400).send({
					error: 'Missing required field: name',
				})
			}

			if (!version) {
				return reply.status(400).send({
					error: 'Missing required field: version',
				})
			}

			if (!envSchema) {
				return reply.status(400).send({
					error: 'Missing required field: envSchema',
				})
			}

			// Validate file type (use x-tar since client sends this)
			if (data.mimetype !== 'application/x-tar') {
				return reply.status(400).send({
					error: 'Invalid file type. Only TAR files are allowed.',
				})
			}

			const pipeData: CreatePipeWithFileDTO = {
				name,
				version,
				description,
				file: data,
				envSchema,
			}

			const result = await this.pipeService.createPipeWithFile(pipeData)

			return reply.status(201).send({
				success: true,
				data: result,
				message: 'Pipe created successfully',
			})
		} catch (error) {
			logger.error('Error in createPipe controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get pipe by ID
	 * GET /pipes/:id
	 */
	async getPipeById(
		request: FastifyRequest<{
			Params: { id: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const pipeId = parseInt(request.params.id)

			if (Number.isNaN(pipeId)) {
				return reply.status(400).send({
					error: 'Invalid pipe ID',
				})
			}

			const pipe = await this.pipeService.getPipeById(pipeId)

			if (!pipe) {
				return reply.status(404).send({
					error: 'Pipe not found',
				})
			}

			return reply.send({
				success: true,
				data: pipe,
			})
		} catch (error) {
			logger.error('Error in getPipeById controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Get pipes with pagination and filtering
	 * GET /pipes
	 */
	async getPipes(
		request: FastifyRequest<{
			Querystring: {
				page?: string
				limit?: string
				search?: string
			}
		}>,
		reply: FastifyReply,
	) {
		try {
			const { page, limit, search } = request.query

			const options: PipeQueryOptions = {
				page: page ? parseInt(page) : undefined,
				limit: limit ? parseInt(limit) : undefined,
				search,
			}

			const result = await this.pipeService.getPipes(options)

			return reply.send({
				success: true,
				data: result,
			})
		} catch (error) {
			logger.error('Error in getPipes controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Update pipe
	 * PUT /pipes/:id
	 */
	async updatePipe(
		request: FastifyRequest<{
			Params: { id: string }
			Body: UpdatePipeDTO
		}>,
		reply: FastifyReply,
	) {
		try {
			const pipeId = parseInt(request.params.id)

			if (isNaN(pipeId)) {
				return reply.status(400).send({
					error: 'Invalid pipe ID',
				})
			}

			const updateData = request.body
			const pipe = await this.pipeService.updatePipe(pipeId, updateData)

			if (!pipe) {
				return reply.status(404).send({
					error: 'Pipe not found',
				})
			}

			return reply.send({
				success: true,
				data: pipe,
				message: 'Pipe updated successfully',
			})
		} catch (error) {
			logger.error('Error in updatePipe controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Delete pipe
	 * DELETE /pipes/:id
	 */
	async deletePipe(
		request: FastifyRequest<{
			Params: { id: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const pipeId = parseInt(request.params.id)

			if (isNaN(pipeId)) {
				return reply.status(400).send({
					error: 'Invalid pipe ID',
				})
			}

			const deleted = await this.pipeService.deletePipe(pipeId)

			if (!deleted) {
				return reply.status(404).send({
					error: 'Pipe not found',
				})
			}

			return reply.status(204).send()
		} catch (error) {
			logger.error('Error in deletePipe controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}

	/**
	 * Download pipe asset by name
	 * GET /pipes/:name/download/:version? (version is optional)
	 */
	async downloadPipe(
		request: FastifyRequest<{
			Params: { name: string; version?: string }
		}>,
		reply: FastifyReply,
	) {
		try {
			const { name, version } = request.params

			if (!name) {
				return reply.status(400).send({
					error: 'Pipe name is required',
				})
			}

			const pipeData = await this.pipeService.getPipeForDownload(name, version)

			if (!pipeData) {
				return reply.status(404).send({
					error: version
						? `Pipe '${name}' version '${version}' not found or no asset available`
						: `Pipe '${name}' not found or no asset available`,
				})
			}

			const { pipe, version: pipeVersion, filePath } = pipeData
			const fileName = `${pipe.name}-${pipeVersion.versionNumber}.tar`

			// Set appropriate headers for file download
			reply.header('Content-Type', 'application/x-tar')
			reply.header('Content-Disposition', `attachment; filename="${fileName}"`)

			// Send the file
			return reply.sendFile(fileName, process.env.STORAGE_DIR || './uploads')
		} catch (error) {
			logger.error('Error in downloadPipe controller:', error)
			return reply.status(500).send({
				error: 'Internal server error',
			})
		}
	}
}
