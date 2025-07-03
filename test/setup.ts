import { beforeAll } from 'vitest'
import dotenv from 'dotenv'

// Load environment variables for testing
dotenv.config({ path: '.env.test' })

beforeAll(() => {
	// Set test environment variables
	process.env.NODE_ENV = 'test'

	// Override database URL for tests if not already set
	if (!process.env.TEST_DATABASE_URL) {
		process.env.TEST_DATABASE_URL = 'postgresql://testuser:testpass@localhost:5433/spm_test_db'
	}

	// Disable logging during tests to reduce noise
	process.env.LOG_LEVEL = 'silent'
}) 
