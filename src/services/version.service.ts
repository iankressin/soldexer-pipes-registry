import { VersionRepository } from '../repositories/version.repository'
import { PipeRepository } from '../repositories/pipe.repository'
import type { CreateVersionDTO, UpdateVersionDTO, VersionQueryOptions, Version } from '../types/version'
import { logger } from '../utils/logger'

export class VersionService {
	private versionRepository: VersionRepository
	private pipeRepository: PipeRepository

	constructor() {
		this.versionRepository = new VersionRepository()
		this.pipeRepository = new PipeRepository()
	}

	/**
	 * Create a new version
	 */
	async createVersion(versionData: CreateVersionDTO): Promise<Version> {
		try {
			// Check if pipe exists
			const pipe = await this.pipeRepository.findById(versionData.pipeId)
			if (!pipe) {
				throw new Error('Pipe not found')
			}

			// Create version
			const newVersion = await this.versionRepository.create({
				...versionData,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			logger.info(`Version created successfully: ${newVersion.versionNumber} for pipe ${pipe.name}`)

			return newVersion
		} catch (error) {
			logger.error('Error creating version:', error)
			throw error
		}
	}

	/**
	 * Get version by ID
	 */
	async getVersionById(id: number): Promise<Version | null> {
		try {
			const version = await this.versionRepository.findById(id)
			return version
		} catch (error) {
			logger.error(`Error fetching version by ID ${id}:`, error)
			throw error
		}
	}

	/**
	 * Get versions by pipe ID
	 */
	async getVersionsByPipeId(pipeId: number): Promise<Version[]> {
		try {
			// Check if pipe exists
			const pipe = await this.pipeRepository.findById(pipeId)
			if (!pipe) {
				throw new Error('Pipe not found')
			}

			const versions = await this.versionRepository.findByPipeId(pipeId)
			return versions
		} catch (error) {
			logger.error(`Error fetching versions for pipe ${pipeId}:`, error)
			throw error
		}
	}

	async getVersionByPipeIdAndVersionNumber(pipeId: number, versionNumber: string): Promise<Version | null> {
		try {
			const version = await this.versionRepository.findByPipeIdAndVersionNumber(pipeId, versionNumber)
			return version
		} catch (error) {
			logger.error(`Error fetching version for pipe ${pipeId} and version ${versionNumber}:`, error)
			throw error
		}
	}

	/**
	 * Get versions with pagination and filtering
	 */
	async getVersions(options: VersionQueryOptions = {}): Promise<{
		versions: Version[]
		totalCount: number
		page: number
		limit: number
		totalPages: number
	}> {
		try {
			const { page = 1, limit = 10 } = options

			const [versions, totalCount] = await Promise.all([
				this.versionRepository.findMany(options),
				this.versionRepository.count(options),
			])

			const totalPages = Math.ceil(totalCount / limit)

			return {
				versions,
				totalCount,
				page,
				limit,
				totalPages,
			}
		} catch (error) {
			logger.error('Error fetching versions:', error)
			throw error
		}
	}

	/**
	 * Get latest version for a pipe
	 */
	async getLatestVersionByPipeId(pipeId: number): Promise<Version | null> {
		try {
			// Check if pipe exists
			const pipe = await this.pipeRepository.findById(pipeId)
			if (!pipe) {
				throw new Error('Pipe not found')
			}

			const version = await this.versionRepository.findLatestByPipeId(pipeId)
			return version
		} catch (error) {
			logger.error(`Error fetching latest version for pipe ${pipeId}:`, error)
			throw error
		}
	}

	/**
	 * Update version
	 */
	async updateVersion(id: number, updateData: UpdateVersionDTO): Promise<Version | null> {
		try {
			const updatedVersion = await this.versionRepository.update(id, updateData)
			if (!updatedVersion) {
				return null
			}

			logger.info(`Version updated successfully: ${updatedVersion.versionNumber}`)

			return updatedVersion
		} catch (error) {
			logger.error(`Error updating version ${id}:`, error)
			throw error
		}
	}

	/**
	 * Delete version
	 */
	async deleteVersion(id: number): Promise<boolean> {
		try {
			const result = await this.versionRepository.delete(id)

			if (result) {
				logger.info(`Version deleted successfully: ID ${id}`)
			}

			return result
		} catch (error) {
			logger.error(`Error deleting version ${id}:`, error)
			throw error
		}
	}
}
