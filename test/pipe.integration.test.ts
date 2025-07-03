import { test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { pipes, versions } from '../src/db/schema'
import { pipeRoutes } from '../src/routes/pipe.routes'
import type { CreatePipeDTO } from '../src/types/pipe'
import multipart from '@fastify/multipart'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://testuser:testpass@localhost:5433/spm_test_db'

let testDb: PostgresJsDatabase
let testClient: Sql
let app: FastifyInstance

beforeAll(async () => {
	try {
		// Set up test database connection
		testClient = postgres(TEST_DATABASE_URL)
		testDb = drizzle(testClient)

		// Test connection before proceeding
		await testClient`SELECT 1`

		// Run migrations for test database
		await migrate(testDb, { migrationsFolder: './drizzle' })

		// Set up Fastify app with routes
		app = Fastify({ logger: false }) // Disable logging for tests

		// Register multipart plugin for file uploads
		await app.register(multipart, {
			limits: {
				fileSize: 100 * 1024 * 1024, // 100MB
			},
		})

		// Override the database instance for testing
		process.env.DATABASE_URL = TEST_DATABASE_URL

		// Register routes
		await app.register(pipeRoutes, { prefix: '/api' })
	} catch (error) {
		console.error('Failed to set up test environment:', error)
		console.error('Make sure PostgreSQL is running with correct credentials:')
		console.error(
			'docker run --name postgres-test -e POSTGRES_DB=spm_test_db -e POSTGRES_USER=testuser -e POSTGRES_PASSWORD=testpass -p 5433:5432 -d postgres:latest',
		)
		throw error
	}
})

afterAll(async () => {
	// Clean up database connection
	try {
		if (testClient) {
			await testClient.end()
		}
		if (app) {
			await app.close()
		}
	} catch (error) {
		console.error('Error during cleanup:', error)
	}
})

beforeEach(async () => {
	// Clean up test data before each test
	await testDb.delete(versions)
	await testDb.delete(pipes)
})

afterEach(async () => {
	// Clean up test data after each test
	await testDb.delete(versions)
	await testDb.delete(pipes)
})

// Integration Tests for createPipe Controller and Service
test('POST /api/pipes - should successfully create a new pipe with version', async () => {
	const createPipeData: CreatePipeDTO = {
		name: 'test-pipe',
		description: 'A test pipe for integration testing',
		version: '1.0.0',
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: createPipeData,
	})

	expect(response.statusCode).toBe(201)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.success).toBe(true)
	expect(responseBody.message).toBe('Pipe created successfully')
	expect(responseBody.data).toBeDefined()
	expect(responseBody.data.pipe).toBeDefined()
	expect(responseBody.data.version).toBeDefined()

	// Verify pipe data
	expect(responseBody.data.pipe.name).toBe(createPipeData.name)
	expect(responseBody.data.pipe.description).toBe(createPipeData.description)
	expect(responseBody.data.pipe.id).toBeDefined()
	expect(responseBody.data.pipe.createdAt).toBeDefined()
	expect(responseBody.data.pipe.updatedAt).toBeDefined()

	// Verify version data
	expect(responseBody.data.version.pipeId).toBe(responseBody.data.pipe.id)
	expect(responseBody.data.version.versionNumber).toBe(createPipeData.version)
	expect(responseBody.data.version.assetUrl).toBe('')
	expect(responseBody.data.version.id).toBeDefined()
	expect(responseBody.data.version.createdAt).toBeDefined()
	expect(responseBody.data.version.updatedAt).toBeDefined()

	// Verify data was actually saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(1)
	expect(savedVersions).toHaveLength(1)
	expect(savedPipes[0].name).toBe(createPipeData.name)
	expect(savedVersions[0].versionNumber).toBe(createPipeData.version)
})

test('POST /api/pipes - should create new version for existing pipe', async () => {
	const createPipeData: CreatePipeDTO = {
		name: 'existing-pipe',
		description: 'An existing pipe',
		version: '1.0.0',
	}

	// Create initial pipe
	const firstResponse = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: createPipeData,
	})

	expect(firstResponse.statusCode).toBe(201)
	const firstResponseBody = JSON.parse(firstResponse.body)
	const pipeId = firstResponseBody.data.pipe.id

	// Create new version for the same pipe
	const newVersionData: CreatePipeDTO = {
		name: 'existing-pipe', // Same name
		description: 'Updated description',
		version: '2.0.0', // New version
	}

	const secondResponse = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: newVersionData,
	})

	expect(secondResponse.statusCode).toBe(201)
	const secondResponseBody = JSON.parse(secondResponse.body)

	// Should return the same pipe but with new version
	expect(secondResponseBody.data.pipe.id).toBe(pipeId)
	expect(secondResponseBody.data.pipe.name).toBe('existing-pipe')
	expect(secondResponseBody.data.version.versionNumber).toBe('2.0.0')
	expect(secondResponseBody.data.version.pipeId).toBe(pipeId)

	// Verify database state - should have 1 pipe and 2 versions
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(1)
	expect(savedVersions).toHaveLength(2)
})

test('POST /api/pipes - should return 400 when name is missing', async () => {
	const invalidData = {
		description: 'A pipe without name',
		versionNumber: '1.0.0',
		// name is missing
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: invalidData,
	})

	expect(response.statusCode).toBe(400)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe('Missing required field: name')

	// Verify no data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(0)
	expect(savedVersions).toHaveLength(0)
})

test('POST /api/pipes - should return 400 when versionNumber is missing', async () => {
	const invalidData = {
		name: 'test-pipe',
		description: 'A pipe without version',
		// versionNumber is missing
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: invalidData,
	})

	expect(response.statusCode).toBe(400)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe('Missing required field: versionNumber')

	// Verify no data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(0)
	expect(savedVersions).toHaveLength(0)
})

test('POST /api/pipes - should return 400 when both name and versionNumber are missing', async () => {
	const invalidData = {
		description: 'A pipe without name and version',
		// name and versionNumber are missing
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: invalidData,
	})

	expect(response.statusCode).toBe(400)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe('Missing required field: name')

	// Verify no data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(0)
	expect(savedVersions).toHaveLength(0)
})

test('POST /api/pipes - should handle empty request body', async () => {
	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: {},
	})

	expect(response.statusCode).toBe(400)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe('Missing required field: name')

	// Verify no data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(0)
	expect(savedVersions).toHaveLength(0)
})

test('POST /api/pipes - should create pipe with minimal valid data', async () => {
	const minimalData: CreatePipeDTO = {
		name: 'minimal-pipe',
		version: '1.0.0',
		// description is optional
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: minimalData,
	})

	expect(response.statusCode).toBe(201)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.success).toBe(true)
	expect(responseBody.data.pipe.name).toBe('minimal-pipe')
	expect(responseBody.data.pipe.description).toBeNull()
	expect(responseBody.data.version.versionNumber).toBe('1.0.0')

	// Verify data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	const savedVersions = await testDb.select().from(versions)

	expect(savedPipes).toHaveLength(1)
	expect(savedVersions).toHaveLength(1)
	expect(savedPipes[0].description).toBeNull()
})

test('POST /api/pipes - should handle special characters in pipe name', async () => {
	const specialCharsData: CreatePipeDTO = {
		name: 'pipe-with-special_chars.123',
		description: 'A pipe with special characters in name',
		version: '1.0.0-beta.1',
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: specialCharsData,
	})

	expect(response.statusCode).toBe(201)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.success).toBe(true)
	expect(responseBody.data.pipe.name).toBe('pipe-with-special_chars.123')
	expect(responseBody.data.version.versionNumber).toBe('1.0.0-beta.1')

	// Verify data was saved to database
	const savedPipes = await testDb.select().from(pipes)
	expect(savedPipes[0].name).toBe('pipe-with-special_chars.123')
})

test('POST /api/pipes - should handle long strings within limits', async () => {
	const longName = 'a'.repeat(255) // Max length for name field
	const longDescription = 'b'.repeat(1000) // Text field should handle this
	const longVersionNumber = '1.0.0-' + 'c'.repeat(40) // Should fit in 50 char limit

	const longStringData: CreatePipeDTO = {
		name: longName,
		description: longDescription,
		version: longVersionNumber,
	}

	const response = await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: longStringData,
	})

	expect(response.statusCode).toBe(201)

	const responseBody = JSON.parse(response.body)
	expect(responseBody.success).toBe(true)
	expect(responseBody.data.pipe.name).toBe(longName)
	expect(responseBody.data.pipe.description).toBe(longDescription)
	expect(responseBody.data.version.versionNumber).toBe(longVersionNumber)
})

// Download Tests
test('GET /api/pipes/:name/download - should download latest version by pipe name', async () => {
	// First, create a pipe with file upload to have something to download
	const testFilePath = path.join(__dirname, '../uploads', 'test-download-pipe-1.0.0.zip')

	// Ensure uploads directory exists
	const uploadsDir = path.dirname(testFilePath)
	if (!fs.existsSync(uploadsDir)) {
		fs.mkdirSync(uploadsDir, { recursive: true })
	}

	// Create a test file
	fs.writeFileSync(testFilePath, 'Test zip file content for download test')

	// Create the pipe and version in database
	const createPipeData: CreatePipeDTO = {
		name: 'test-download-pipe',
		description: 'A test pipe for download testing',
		version: '1.0.0',
	}

	await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: createPipeData,
	})

	// Now test the download
	const downloadResponse = await app.inject({
		method: 'GET',
		url: '/api/pipes/test-download-pipe/download',
	})

	expect(downloadResponse.statusCode).toBe(200)
	expect(downloadResponse.headers['content-type']).toBe('application/zip')
	expect(downloadResponse.headers['content-disposition']).toBe('attachment; filename="test-download-pipe-1.0.0.zip"')
	expect(downloadResponse.body).toBe('Test zip file content for download test')

	// Clean up
	if (fs.existsSync(testFilePath)) {
		fs.unlinkSync(testFilePath)
	}
})

test('GET /api/pipes/:name/download/:version - should download specific version by pipe name and version', async () => {
	// Create test files for multiple versions
	const testFile1Path = path.join(__dirname, '../uploads', 'multi-version-pipe-1.0.0.zip')
	const testFile2Path = path.join(__dirname, '../uploads', 'multi-version-pipe-2.0.0.zip')

	// Ensure uploads directory exists
	const uploadsDir = path.dirname(testFile1Path)
	if (!fs.existsSync(uploadsDir)) {
		fs.mkdirSync(uploadsDir, { recursive: true })
	}

	fs.writeFileSync(testFile1Path, 'Version 1.0.0 content')
	fs.writeFileSync(testFile2Path, 'Version 2.0.0 content')

	// Create pipe with version 1.0.0
	await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: {
			name: 'multi-version-pipe',
			description: 'A pipe with multiple versions',
			version: '1.0.0',
		},
	})

	// Create version 2.0.0
	await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: {
			name: 'multi-version-pipe',
			description: 'A pipe with multiple versions',
			version: '2.0.0',
		},
	})

	// Download specific version 1.0.0
	const downloadV1Response = await app.inject({
		method: 'GET',
		url: '/api/pipes/multi-version-pipe/download/1.0.0',
	})

	expect(downloadV1Response.statusCode).toBe(200)
	expect(downloadV1Response.headers['content-disposition']).toBe('attachment; filename="multi-version-pipe-1.0.0.zip"')
	expect(downloadV1Response.body).toBe('Version 1.0.0 content')

	// Download specific version 2.0.0
	const downloadV2Response = await app.inject({
		method: 'GET',
		url: '/api/pipes/multi-version-pipe/download/2.0.0',
	})

	expect(downloadV2Response.statusCode).toBe(200)
	expect(downloadV2Response.headers['content-disposition']).toBe('attachment; filename="multi-version-pipe-2.0.0.zip"')
	expect(downloadV2Response.body).toBe('Version 2.0.0 content')

	// Clean up
	if (fs.existsSync(testFile1Path)) fs.unlinkSync(testFile1Path)
	if (fs.existsSync(testFile2Path)) fs.unlinkSync(testFile2Path)
})

test('GET /api/pipes/:name/download - should return 404 for non-existent pipe', async () => {
	const response = await app.inject({
		method: 'GET',
		url: '/api/pipes/non-existent-pipe/download',
	})

	expect(response.statusCode).toBe(404)
	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe("Pipe 'non-existent-pipe' not found or no asset available")
})

test('GET /api/pipes/:name/download/:version - should return 404 for non-existent version', async () => {
	// Create a pipe first
	await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: {
			name: 'existing-pipe',
			description: 'A pipe that exists',
			version: '1.0.0',
		},
	})

	// Try to download non-existent version
	const response = await app.inject({
		method: 'GET',
		url: '/api/pipes/existing-pipe/download/999.0.0',
	})

	expect(response.statusCode).toBe(404)
	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe("Pipe 'existing-pipe' version '999.0.0' not found or no asset available")
})

test('GET /api/pipes/:name/download - should return 404 when file does not exist on filesystem', async () => {
	// Create a pipe without actually creating the file
	await app.inject({
		method: 'POST',
		url: '/api/pipes',
		payload: {
			name: 'pipe-without-file',
			description: 'A pipe without actual file',
			version: '1.0.0',
		},
	})

	const response = await app.inject({
		method: 'GET',
		url: '/api/pipes/pipe-without-file/download',
	})

	expect(response.statusCode).toBe(404)
	const responseBody = JSON.parse(response.body)
	expect(responseBody.error).toBe("Pipe 'pipe-without-file' not found or no asset available")
})
