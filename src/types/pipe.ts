import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { pipes } from '../models/pipe.model'
import type { MultipartFile } from '@fastify/multipart'
import type { Version } from './version'

// Inferred types from Drizzle schema
export type Pipe = InferSelectModel<typeof pipes>
export type NewPipe = InferInsertModel<typeof pipes>

// Type for pipe with all its versions
export type PipeWithVersions = Pipe & {
	versions: Version[]
}

// Custom types for API operations
export type CreatePipeDTO = Omit<NewPipe, 'id' | 'createdAt' | 'updatedAt'> & {
	version: Version['versionNumber']
	envSchema: Version['envSchema']
}

// Type for file upload with form data
export interface CreatePipeWithFileDTO {
	name: string
	version: Version['versionNumber']
	description?: string
	file: MultipartFile
	envSchema: Version['envSchema']
}

export type UpdatePipeDTO = Partial<Omit<Pipe, 'id' | 'createdAt' | 'updatedAt'>>

// Query options
export interface PipeQueryOptions {
		page?: number
		limit?: number
		search?: string
		includeVersions?: boolean
	}
