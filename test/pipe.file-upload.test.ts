import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { pipeRoutes } from '../src/routes/pipe.routes'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'

describe('Pipe File Upload Integration Tests', () => {
	let fastify: any
	let testFilePath: string

	beforeEach(async () => {
		// Setup Fastify instance
		fastify = Fastify({ logger: false })

		// Register multipart plugin
		await fastify.register(multipart, {
			limits: {
				fileSize: 100 * 1024 * 1024, // 100MB
			},
		})

		// Register routes
		await fastify.register(pipeRoutes)

		// Create a test zip file
		testFilePath = path.join(__dirname, 'test-pipe.zip')
		fs.writeFileSync(testFilePath, 'Test zip file content')
	})

	afterEach(async () => {
		// Clean up test file
		if (fs.existsSync(testFilePath)) {
			fs.unlinkSync(testFilePath)
		}

		// Clean up uploaded files
		const uploadsDir = './uploads'
		if (fs.existsSync(uploadsDir)) {
			const files = fs.readdirSync(uploadsDir)
			for (const file of files) {
				if (file.startsWith('test-pipe-')) {
					fs.unlinkSync(path.join(uploadsDir, file))
				}
			}
		}

		await fastify.close()
	})

	it('should upload a pipe file successfully', async () => {
		// Create form data
		const form = new FormData()
		form.append('file', fs.createReadStream(testFilePath), {
			filename: 'test-pipe-1.0.0.zip',
			contentType: 'application/zip',
		})
		form.append('name', 'test-pipe')
		form.append('version', '1.0.0')
		form.append('description', 'Test pipe for file upload')

		// Make request
		const response = await fastify.inject({
			method: 'POST',
			url: '/pipes',
			payload: form,
			headers: form.getHeaders(),
		})

		// Verify response
		expect(response.statusCode).toBe(201)

		const body = JSON.parse(response.body)
		expect(body.success).toBe(true)
		expect(body.data.pipe.name).toBe('test-pipe')
		expect(body.data.version.versionNumber).toBe('1.0.0')
		expect(body.data.version.assetUrl).toContain('test-pipe-1.0.0.zip')
		expect(body.message).toBe('Pipe created successfully')
	})

	it('should reject upload without file', async () => {
		const response = await fastify.inject({
			method: 'POST',
			url: '/pipes',
			payload: {},
			headers: { 'content-type': 'application/json' },
		})

		expect(response.statusCode).toBe(400)
		const body = JSON.parse(response.body)
		expect(body.error).toBe('No file uploaded')
	})

	it('should reject upload with invalid file type', async () => {
		// Create a text file instead of zip
		const textFilePath = path.join(__dirname, 'test.txt')
		fs.writeFileSync(textFilePath, 'Not a zip file')

		const form = new FormData()
		form.append('file', fs.createReadStream(textFilePath), {
			filename: 'test.txt',
			contentType: 'text/plain',
		})
		form.append('name', 'test-pipe')
		form.append('version', '1.0.0')

		const response = await fastify.inject({
			method: 'POST',
			url: '/pipes',
			payload: form,
			headers: form.getHeaders(),
		})

		expect(response.statusCode).toBe(400)
		const body = JSON.parse(response.body)
		expect(body.error).toBe('Invalid file type. Only ZIP files are allowed.')

		// Clean up
		fs.unlinkSync(textFilePath)
	})

	it('should reject upload without required fields', async () => {
		const form = new FormData()
		form.append('file', fs.createReadStream(testFilePath), {
			filename: 'test-pipe-1.0.0.zip',
			contentType: 'application/zip',
		})
		// Missing name and version fields

		const response = await fastify.inject({
			method: 'POST',
			url: '/pipes',
			payload: form,
			headers: form.getHeaders(),
		})

		expect(response.statusCode).toBe(400)
		const body = JSON.parse(response.body)
		expect(body.error).toBe('Missing required field: name')
	})
}) 
