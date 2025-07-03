import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

let client: Sql | null = null
let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
	if (!_db) {
		const connectionString = process.env.DATABASE_URL || 'postgresql://spm_user:spm_password@localhost:5432/spm_db'
		client = postgres(connectionString)
		_db = drizzle(client, { schema })
	}
	return _db
}

export const db = getDb()

export default db

export async function closeDb() {
	if (client) {
		await client.end()
		client = null
		_db = null
	}
}
