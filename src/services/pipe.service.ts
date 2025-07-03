import type { CreatePipeDTO, UpdatePipeDTO, PipeQueryOptions, Pipe, CreatePipeWithFileDTO } from '../types/pipe'
import type { Version } from '../types/version'
import { logger } from '../utils/logger'
import { VersionService } from './version.service'
import { PipeRepository } from '../repositories/pipe.repository'
import { FileStorageService } from './file-storage.service'

export class PipeService {
	private pipeRepository: PipeRepository
	private versionService: VersionService
	private fileStorageService: FileStorageService

	constructor() {
		this.pipeRepository = new PipeRepository()
		this.versionService = new VersionService()
		this.fileStorageService = new FileStorageService()
	}

	/**
	 * Create a new pipe with file upload
	 */
	async createPipeWithFile(pipeData: CreatePipeWithFileDTO): Promise<{ pipe: Pipe; version: Version }> {
		try {
			// Store the uploaded file
			const storedFile = await this.fileStorageService.storeFile(pipeData.file, pipeData.name, pipeData.version)

			let pipe = await this.getPipeByName(pipeData.name)
			let version: Version

			if (!pipe) {
				// Create new pipe
				pipe = await this.pipeRepository.create({
					name: pipeData.name,
					description: pipeData.description,
					createdAt: new Date(),
					updatedAt: new Date(),
				})

				console.log('pipeData.envSchema if', pipeData.envSchema)
				// Create initial version with file URL
				version = await this.versionService.createVersion({
					pipeId: pipe.id,
					versionNumber: pipeData.version,
					assetUrl: storedFile.url,
					envSchema: pipeData.envSchema,
				})
			} else {
				console.log('pipeData.envSchema else', pipeData.envSchema)
				// Pipe exists, create new version
				version = await this.versionService.createVersion({
					pipeId: pipe.id,
					versionNumber: pipeData.version,
					assetUrl: storedFile.url,
					envSchema: pipeData.envSchema,
				})
			}

			logger.info(`Pipe created/updated successfully: ${pipe.name}:${version.versionNumber}`)

			return {
				pipe,
				version,
			}
		} catch (error) {
			logger.error('Error creating pipe with file:', error)
			throw error
		}
	}

	/**
	 * Create a new pipe
	 */
	// TODO: asset upload
	async createPipe(pipeData: CreatePipeDTO): Promise<{ pipe: Pipe; version: Version }> {
		try {
			let pipe = await this.getPipeByName(pipeData.name)
			let version: Version
			if (!pipe) {
				pipe = await this.pipeRepository.create({
					...pipeData,
					createdAt: new Date(),
					updatedAt: new Date(),
				})

				version = await this.versionService.createVersion({
					pipeId: pipe.id,
					versionNumber: pipeData.version,
					assetUrl: '',
					envSchema: pipeData.envSchema,
				})
			} else {
				version = await this.versionService.createVersion({
					pipeId: pipe.id,
					versionNumber: pipeData.version,
					assetUrl: '',
					envSchema: pipeData.envSchema,
				})
			}

			return {
				pipe,
				version,
			}
		} catch (error) {
			logger.error('Error creating pipe:', error)
			throw error
		}
	}

	/**
	 * Get pipe by ID
	 */
	async getPipeById(id: number): Promise<Pipe | null> {
		try {
			const pipe = await this.pipeRepository.findById(id)
			return pipe
		} catch (error) {
			logger.error(`Error fetching pipe by ID ${id}:`, error)
			throw error
		}
	}

	async getPipeByName(name: string): Promise<Pipe | null> {
		try {
			const pipe = await this.pipeRepository.findByName(name)
			return pipe
		} catch (error) {
			console.log(error)
			logger.error(`Error fetching pipe by name ${name}:`, error)
			throw error
		}
	}

	/**
	 * Get pipes with pagination and filtering
	 */
	async getPipes(options: PipeQueryOptions = {}): Promise<{
		pipes: Pipe[]
		totalCount: number
		page: number
		limit: number
		totalPages: number
	}> {
		try {
			const { page = 1, limit = 10 } = options

			const [pipes, totalCount] = await Promise.all([
				this.pipeRepository.findMany(options),
				this.pipeRepository.count(options),
			])

			const totalPages = Math.ceil(totalCount / limit)

			return {
				pipes,
				totalCount,
				page,
				limit,
				totalPages,
			}
		} catch (error) {
			logger.error('Error fetching pipes:', error)
			throw error
		}
	}

	/**
	 * Update pipe
	 */
	async updatePipe(id: number, updateData: UpdatePipeDTO): Promise<Pipe | null> {
		try {
			const updatedPipe = await this.pipeRepository.update(id, updateData)
			if (!updatedPipe) {
				return null
			}

			logger.info(`Pipe updated successfully: ${updatedPipe.name}`)

			return updatedPipe
		} catch (error) {
			logger.error(`Error updating pipe ${id}:`, error)
			throw error
		}
	}

	/**
	 * Delete pipe
	 */
	async deletePipe(id: number): Promise<boolean> {
		try {
			const result = await this.pipeRepository.delete(id)

			if (result) {
				logger.info(`Pipe deleted successfully: ID ${id}`)
			}

			return result
		} catch (error) {
			logger.error(`Error deleting pipe ${id}:`, error)
			throw error
		}
	}

	/**
	 * Get pipe with latest version by name for download
	 */
	async getPipeForDownload(
		name: string,
		version?: string,
	): Promise<{ pipe: Pipe; version: Version; filePath: string } | null> {
		try {
			const pipe = await this.getPipeByName(name)
			if (!pipe) {
				return null
			}

			let pipeVersion: Version | null

			if (version) {
				// Get specific version
				const versions = await this.versionService.getVersionsByPipeId(pipe.id)
				pipeVersion = versions.find((v) => v.versionNumber === version) || null
			} else {
				// Get latest version
				pipeVersion = await this.versionService.getLatestVersionByPipeId(pipe.id)
			}

			if (!pipeVersion || !pipeVersion.assetUrl) {
				return null
			}

			// Generate filename based on pipe name and version
			const fileName = `${pipe.name}-${pipeVersion.versionNumber}.tar`
			const filePath = this.fileStorageService.getFilePath(fileName)

			// Check if file exists
			const fileExists = await this.fileStorageService.fileExists(fileName)
			if (!fileExists) {
				logger.error(`File not found: ${fileName}`)
				return null
			}

			return {
				pipe,
				version: pipeVersion,
				filePath,
			}
		} catch (error) {
			logger.error(`Error fetching pipe for download ${name}:`, error)
			throw error
		}
	}
}
