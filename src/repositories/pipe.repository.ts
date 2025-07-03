import { eq, ilike, and, or, desc } from 'drizzle-orm'
import { getDb } from '../db/index'
import { pipes } from '../models/pipe.model'
import type { Pipe, NewPipe, UpdatePipeDTO, PipeQueryOptions } from '../types/pipe'

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
	async findMany(options: PipeQueryOptions = {}): Promise<Pipe[]> {
		const { page = 1, limit = 10, search } = options

		let query = this.db.select().from(pipes)

		// Build where conditions
		if (search) {
			query = query.where(or(ilike(pipes.name, `%${search}%`), ilike(pipes.description, `%${search}%`))) as typeof query
		}

		// Add pagination and ordering
		const result = await query
			.orderBy(desc(pipes.createdAt))
			.limit(limit)
			.offset((page - 1) * limit)

		return result
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
			query = query.where(or(ilike(pipes.name, `%${search}%`), ilike(pipes.description, `%${search}%`))) as typeof query
		}

		const [result] = await query
		return result.count
	}
}
