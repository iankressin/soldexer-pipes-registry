import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartFile } from '@fastify/multipart'
import { logger } from '../utils/logger'
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'

export interface StoredFile {
	fileName: string
	filePath: string
	url: string
	size: number
}

export class FileStorageService {
	private readonly storageDir: string
	private readonly baseUrl: string

	constructor() {
		this.storageDir = process.env.STORAGE_DIR || './uploads'
		this.baseUrl = process.env.BASE_URL || 'http://localhost:3000'
		this.ensureStorageDirectory()
	}

	/**
	 * Ensure storage directory exists
	 */
	private async ensureStorageDirectory(): Promise<void> {
		try {
			await fs.access(this.storageDir)
		} catch {
			await fs.mkdir(this.storageDir, { recursive: true })
			logger.info(`Created storage directory: ${this.storageDir}`)
		}
	}

	/**
	 * Store uploaded file and return file information
	 */
	async storeFile(file: MultipartFile, pipeName: string, version: string): Promise<StoredFile> {
		try {
			// Generate unique filename
			const fileName = `${pipeName}-${version}.tar`
			const filePath = path.join(this.storageDir, fileName)

			// Create write stream and pipe the file
			const writeStream = createWriteStream(filePath)
			await pipeline(file.file, writeStream)

			// Get file stats
			const stats = await fs.stat(filePath)

			// Generate URL
			const url = `${this.baseUrl}/files/${fileName}`

			const storedFile: StoredFile = {
				fileName,
				filePath,
				url,
				size: stats.size,
			}

			logger.info(`File stored successfully: ${fileName} (${stats.size} bytes)`)
			return storedFile
		} catch (error) {
			console.log('error', error)
			logger.error('Error storing file:', error)
			throw new Error('Failed to store file')
		}
	}

	/**
	 * Check if file exists
	 */
	async fileExists(fileName: string): Promise<boolean> {
		try {
			const filePath = path.join(this.storageDir, fileName)
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Delete file
	 */
	async deleteFile(fileName: string): Promise<boolean> {
		try {
			const filePath = path.join(this.storageDir, fileName)
			await fs.unlink(filePath)
			logger.info(`File deleted: ${fileName}`)
			return true
		} catch (error) {
			logger.error(`Error deleting file ${fileName}:`, error)
			return false
		}
	}

	/**
	 * Get file path for serving
	 */
	getFilePath(fileName: string): string {
		return path.join(this.storageDir, fileName)
	}
} 
