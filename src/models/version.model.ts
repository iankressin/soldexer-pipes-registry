import { pgTable, serial, varchar, text, timestamp, integer, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'
import { pipes } from './pipe.model'

export const versions = pgTable(
	'versions',
	{
		id: serial('id').primaryKey(),
		pipeId: integer('pipe_id')
			.notNull()
			.references(() => pipes.id, { onDelete: 'cascade' }),
		versionNumber: varchar('version_number', { length: 50 }).notNull().unique(),
		assetUrl: text('asset_url').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		envSchema: jsonb('env_schema').notNull(),
	},
	(table) => ({
		// Ensure version number is unique per pipe
		uniquePipeVersion: uniqueIndex('unique_pipe_version').on(table.pipeId, table.versionNumber),
	}),
)
