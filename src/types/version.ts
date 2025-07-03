import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'
import { versions } from '../models/version.model'

// Inferred types from Drizzle schema
export type Version = InferSelectModel<typeof versions>
export type NewVersion = InferInsertModel<typeof versions>

// Custom types for API operations
export type CreateVersionDTO = Omit<NewVersion, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateVersionDTO = Partial<Omit<Version, 'id' | 'createdAt' | 'updatedAt'>>

// Query options
export interface VersionQueryOptions {
	page?: number
	limit?: number
	pipeId?: number
}
