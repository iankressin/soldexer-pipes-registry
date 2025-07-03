import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const pipes = pgTable('pipes', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
