import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db/index'
import { versions } from '../models/version.model'
import type { Version, NewVersion, UpdateVersionDTO, VersionQueryOptions } from '../types/version'

export class VersionRepository {
	/**
	 * Create a new version
	 */
	async create(versionData: NewVersion): Promise<Version> {
		const [version] = await db.insert(versions).values(versionData).returning()
		return version
	}

	/**
	 * Find version by ID
	 */
	async findById(id: number): Promise<Version | null> {
		const [version] = await db.select().from(versions).where(eq(versions.id, id))
		return version || null
	}

	/**
	 * Find versions by pipe ID
	 */
	async findByPipeId(pipeId: number): Promise<Version[]> {
		const result = await db.select().from(versions).where(eq(versions.pipeId, pipeId)).orderBy(desc(versions.createdAt))

		return result
	}

	/**
	 * Find all versions with optional filtering and pagination
	 */
	async findMany(options: VersionQueryOptions = {}): Promise<Version[]> {
		const { page = 1, limit = 10, pipeId } = options

		let query = db.select().from(versions)

		// Build where conditions
		if (pipeId !== undefined) {
			query = query.where(eq(versions.pipeId, pipeId)) as typeof query
		}

		// Add pagination and ordering
		const result = await query
			.orderBy(desc(versions.createdAt))
			.limit(limit)
			.offset((page - 1) * limit)

		return result
	}

	async findByPipeIdAndVersionNumber(pipeId: number, versionNumber: string): Promise<Version | null> {
		const [version] = await db
			.select()
			.from(versions)
			.where(and(eq(versions.pipeId, pipeId), eq(versions.versionNumber, versionNumber)))
		return version || null
	}

	/**
	 * Update version by ID
	 */
	async update(id: number, updateData: UpdateVersionDTO): Promise<Version | null> {
		const [version] = await db
			.update(versions)
			.set({ ...updateData, updatedAt: new Date() })
			.where(eq(versions.id, id))
			.returning()

		return version || null
	}

	/**
	 * Delete version by ID
	 */
	async delete(id: number): Promise<boolean> {
		const result = await db.delete(versions).where(eq(versions.id, id))
		return result.length > 0
	}

	/**
	 * Count total versions
	 */
	async count(options: Omit<VersionQueryOptions, 'page' | 'limit'> = {}): Promise<number> {
		const { pipeId } = options

		let query = db.select({ count: versions.id }).from(versions)

		// Build where conditions
		if (pipeId !== undefined) {
			query = query.where(eq(versions.pipeId, pipeId)) as typeof query
		}

		const [result] = await query
		return result.count
	}

	/**
	 * Get latest version for a pipe
	 */
	async findLatestByPipeId(pipeId: number): Promise<Version | null> {
		const [version] = await db
			.select()
			.from(versions)
			.where(eq(versions.pipeId, pipeId))
			.orderBy(desc(versions.createdAt))
			.limit(1)

		return version || null
	}
}
