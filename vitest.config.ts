import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		testTimeout: 30000, // 30 seconds for database operations
		hookTimeout: 30000, // 30 seconds for setup/teardown
		pool: 'forks', // Run tests in separate processes for better isolation
		sequence: {
			concurrent: false, // Run tests sequentially to avoid database conflicts
		},
		env: {
			NODE_ENV: 'test',
			TEST_DATABASE_URL: 'postgresql://testuser:testpass@localhost:5433/spm_test_db',
		},
	},
}) 
