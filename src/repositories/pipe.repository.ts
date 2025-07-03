import { eq, ilike, and, or, desc } from 'drizzle-orm'
import { getDb } from '../db/index'
import { pipes } from '../models/pipe.model'
import { versions } from '../models/version.model'
import type { Pipe, NewPipe, UpdatePipeDTO, PipeQueryOptions, PipeWithVersions } from '../types/pipe'
import type { Version } from '../types/version'

export class PipeRepository {
		private get db() {
			return getDb()
		}
		/**
		 * Create a new pipe
		 */
		async create(pipeData: NewPipe): Promise<Pipe> {
			const [pipe] = await this.db.insert(pipes).values(pipeData).returning()
			return pipe
		}

		/**
		 * Find pipe by ID
		 */
		async findById(id: number): Promise<Pipe | null> {
			const [pipe] = await this.db.select().from(pipes).where(eq(pipes.id, id))
			return pipe || null
		}

		async findByName(name: string): Promise<Pipe | null> {
			const [pipe] = await this.db.select().from(pipes).where(eq(pipes.name, name))
			return pipe || null
		}

		/**
		 * Find all pipes with optional filtering and pagination
		 */
		async findMany(options: PipeQueryOptions = {}): Promise<Pipe[] | PipeWithVersions[]> {
			const { page = 1, limit = 10, search, includeVersions = false } = options

			if (includeVersions) {
				return this.findManyWithVersions(options)
			}

			let query = this.db.select().from(pipes)

			// Build where conditions
			if (search) {
				query = query.where(
					or(ilike(pipes.name, `%${search}%`), ilike(pipes.description, `%${search}%`)),
				) as typeof query
			}

			// Add pagination and ordering
			const result = await query
				.orderBy(desc(pipes.createdAt))
				.limit(limit)
				.offset((page - 1) * limit)

			return result
		}

		/**
		 * Find all pipes with their versions using a left join
		 */
		async findManyWithVersions(options: PipeQueryOptions = {}): Promise<PipeWithVersions[]> {
			const { page = 1, limit = 10, search } = options

			// Select all pipe fields and version fields
			let query = this.db
				.select({
					// Pipe fields
					id: pipes.id,
					name: pipes.name,
					description: pipes.description,
					createdAt: pipes.createdAt,
					updatedAt: pipes.updatedAt,
					// Version fields (nullable since it's a left join)
					versionId: versions.id,
					versionPipeId: versions.pipeId,
					versionNumber: versions.versionNumber,
					assetUrl: versions.assetUrl,
					versionCreatedAt: versions.createdAt,
					versionUpdatedAt: versions.updatedAt,
					envSchema: versions.envSchema,
				})
				.from(pipes)
				.leftJoin(versions, eq(pipes.id, versions.pipeId))

			// Build where conditions
			if (search) {
				query = query.where(
					or(ilike(pipes.name, `%${search}%`), ilike(pipes.description, `%${search}%`)),
				) as typeof query
			}

			// Add ordering by pipe creation date, then version creation date
			const result = await query
				.orderBy(desc(pipes.createdAt), desc(versions.createdAt))
				.limit(limit * 10) // Get more results to account for multiple versions per pipe
				.offset((page - 1) * limit * 10)

			// Group results by pipe and collect versions
			const pipeMap = new Map<number, PipeWithVersions>()

			for (const row of result) {
				const pipeId = row.id

				if (!pipeMap.has(pipeId)) {
					pipeMap.set(pipeId, {
						id: row.id,
						name: row.name,
						description: row.description,
						createdAt: row.createdAt,
						updatedAt: row.updatedAt,
						versions: [],
					})
				}

				const pipe = pipeMap.get(pipeId)!

				// If there's version data, add it to the versions array
				if (row.versionId) {
					pipe.versions.push({
						id: row.versionId,
						pipeId: row.versionPipeId!,
						versionNumber: row.versionNumber!,
						assetUrl: row.assetUrl!,
						createdAt: row.versionCreatedAt!,
						updatedAt: row.versionUpdatedAt!,
						envSchema: row.envSchema!,
					})
				}
			}

			// Convert map to array and apply pagination at the pipe level
			const pipesWithVersions = Array.from(pipeMap.values())
			const startIndex = (page - 1) * limit
			const endIndex = startIndex + limit

			return pipesWithVersions.slice(startIndex, endIndex)
		}

		/**
		 * Update pipe by ID
		 */
		async update(id: number, updateData: UpdatePipeDTO): Promise<Pipe | null> {
			const [pipe] = await this.db
				.update(pipes)
				.set({ ...updateData, updatedAt: new Date() })
				.where(eq(pipes.id, id))
				.returning()

			return pipe || null
		}

		/**
		 * Delete pipe by ID
		 */
		async delete(id: number): Promise<boolean> {
			const result = await this.db.delete(pipes).where(eq(pipes.id, id))
			return result.length > 0
		}

		/**
		 * Count total pipes
		 */
		async count(options: Omit<PipeQueryOptions, 'page' | 'limit'> = {}): Promise<number> {
			const { search } = options

			let query = this.db.select({ count: pipes.id }).from(pipes)

			// Build where conditions
			if (search) {
				query = query.where(
					or(ilike(pipes.name, `%${search}%`), ilike(pipes.description, `%${search}%`)),
				) as typeof query
			}

			const [result] = await query
			return result.count
		}
	}
