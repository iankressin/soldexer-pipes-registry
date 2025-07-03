import { test, expect, vi, beforeEach, afterEach, describe } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { PipeController } from '../src/controllers/pipe.controller'
import { PipeService } from '../src/services/pipe.service'
import type { CreatePipeDTO } from '../src/types/pipe'

// Mock the dependencies
vi.mock('../src/services/pipe.service')
vi.mock('../src/utils/logger', () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}))

describe('PipeController Unit Tests', () => {
	let controller: PipeController
	let mockPipeService: any
	let mockRequest: Partial<FastifyRequest>
	let mockReply: Partial<FastifyReply>

	beforeEach(() => {
		// Create mocked service
		mockPipeService = {
			createPipe: vi.fn(),
			getPipeById: vi.fn(),
			getPipes: vi.fn(),
			updatePipe: vi.fn(),
			deletePipe: vi.fn(),
		}

		// Mock the PipeService constructor to return our mock
		vi.mocked(PipeService).mockImplementation(() => mockPipeService)

		controller = new PipeController()

		// Mock Fastify request and reply
		mockReply = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('createPipe', () => {
		test('should successfully create a pipe', async () => {
			const mockPipeData: CreatePipeDTO = {
				name: 'test-pipe',
				description: 'Test description',
				version: '1.0.0',
			}

			const mockResult = {
				pipe: { id: 1, name: 'test-pipe', description: 'Test description' },
				version: { id: 1, pipeId: 1, versionNumber: '1.0.0', assetUrl: '' },
			}

			mockRequest = {
				body: mockPipeData,
			}

			mockPipeService.createPipe.mockResolvedValue(mockResult)

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).toHaveBeenCalledWith(mockPipeData)
			expect(mockReply.status).toHaveBeenCalledWith(201)
			expect(mockReply.send).toHaveBeenCalledWith({
				success: true,
				data: mockResult,
				message: 'Pipe created successfully',
			})
		})

		test('should return 400 when name is missing', async () => {
			mockRequest = {
				body: {
					description: 'Test description',
					versionNumber: '1.0.0',
					// name is missing
				},
			}

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).not.toHaveBeenCalled()
			expect(mockReply.status).toHaveBeenCalledWith(400)
			expect(mockReply.send).toHaveBeenCalledWith({
				error: 'Missing required field: name',
			})
		})

		test('should return 400 when versionNumber is missing', async () => {
			mockRequest = {
				body: {
					name: 'test-pipe',
					description: 'Test description',
					// versionNumber is missing
				},
			}

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).not.toHaveBeenCalled()
			expect(mockReply.status).toHaveBeenCalledWith(400)
			expect(mockReply.send).toHaveBeenCalledWith({
				error: 'Missing required field: versionNumber',
			})
		})

		test('should return 500 when service throws error', async () => {
			const mockPipeData: CreatePipeDTO = {
				name: 'test-pipe',
				description: 'Test description',
				version: '1.0.0',
			}

			mockRequest = {
				body: mockPipeData,
			}

			const serviceError = new Error('Database connection failed')
			mockPipeService.createPipe.mockRejectedValue(serviceError)

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).toHaveBeenCalledWith(mockPipeData)
			expect(mockReply.status).toHaveBeenCalledWith(500)
			expect(mockReply.send).toHaveBeenCalledWith({
				error: 'Internal server error',
			})
		})

		test('should handle empty body gracefully', async () => {
			mockRequest = {
				body: {},
			}

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).not.toHaveBeenCalled()
			expect(mockReply.status).toHaveBeenCalledWith(400)
			expect(mockReply.send).toHaveBeenCalledWith({
				error: 'Missing required field: name',
			})
		})

		test('should handle null body gracefully', async () => {
			mockRequest = {
				body: null as any,
			}

			await controller.createPipe(mockRequest as FastifyRequest<{ Body: CreatePipeDTO }>, mockReply as FastifyReply)

			expect(mockPipeService.createPipe).not.toHaveBeenCalled()
			expect(mockReply.status).toHaveBeenCalledWith(400)
			expect(mockReply.send).toHaveBeenCalledWith({
				error: 'Missing required field: name',
			})
		})
	})
})

describe('PipeService Unit Tests', () => {
	let service: PipeService
	let mockPipeRepository: any
	let mockVersionService: any

	beforeEach(() => {
		// Mock the dependencies
		mockPipeRepository = {
			create: vi.fn(),
			findById: vi.fn(),
			findByName: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		}

		mockVersionService = {
			createVersion: vi.fn(),
		}

		// Mock the imports
		vi.doMock('../src/repositories/pipe.repository', () => ({
			PipeRepository: vi.fn().mockImplementation(() => mockPipeRepository),
		}))

		vi.doMock('../src/services/version.service', () => ({
			VersionService: vi.fn().mockImplementation(() => mockVersionService),
		}))

		// Create service instance
		service = new PipeService()

		// Manually inject mocks
		;(service as any).pipeRepository = mockPipeRepository
		;(service as any).versionService = mockVersionService
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('createPipe', () => {
		test('should create new pipe when pipe does not exist', async () => {
			const pipeData: CreatePipeDTO = {
				name: 'new-pipe',
				description: 'New pipe description',
				version: '1.0.0',
			}

			const mockPipe = {
				id: 1,
				name: 'new-pipe',
				description: 'New pipe description',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const mockVersion = {
				id: 1,
				pipeId: 1,
				versionNumber: '1.0.0',
				assetUrl: '',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			// Mock pipe doesn't exist
			mockPipeRepository.findByName.mockResolvedValue(null)
			mockPipeRepository.create.mockResolvedValue(mockPipe)
			mockVersionService.createVersion.mockResolvedValue(mockVersion)

			const result = await service.createPipe(pipeData)

			expect(mockPipeRepository.findByName).toHaveBeenCalledWith('new-pipe')
			expect(mockPipeRepository.create).toHaveBeenCalledWith({
				...pipeData,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			})
			expect(mockVersionService.createVersion).toHaveBeenCalledWith({
				pipeId: 1,
				versionNumber: '1.0.0',
				assetUrl: '',
			})

			expect(result).toEqual({
				pipe: mockPipe,
				version: mockVersion,
			})
		})

		test('should create new version when pipe already exists', async () => {
			const pipeData: CreatePipeDTO = {
				name: 'existing-pipe',
				description: 'Updated description',
				version: '2.0.0',
			}

			const existingPipe = {
				id: 1,
				name: 'existing-pipe',
				description: 'Original description',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const mockVersion = {
				id: 2,
				pipeId: 1,
				versionNumber: '2.0.0',
				assetUrl: '',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			// Mock pipe exists
			mockPipeRepository.findByName.mockResolvedValue(existingPipe)
			mockVersionService.createVersion.mockResolvedValue(mockVersion)

			const result = await service.createPipe(pipeData)

			expect(mockPipeRepository.findByName).toHaveBeenCalledWith('existing-pipe')
			expect(mockPipeRepository.create).not.toHaveBeenCalled() // Should not create new pipe
			expect(mockVersionService.createVersion).toHaveBeenCalledWith({
				pipeId: 1,
				versionNumber: '2.0.0',
				assetUrl: '',
			})

			expect(result).toEqual({
				pipe: existingPipe,
				version: mockVersion,
			})
		})

		test('should throw error when repository fails', async () => {
			const pipeData: CreatePipeDTO = {
				name: 'error-pipe',
				description: 'Error description',
				version: '1.0.0',
			}

			const repositoryError = new Error('Database connection failed')
			mockPipeRepository.findByName.mockRejectedValue(repositoryError)

			await expect(service.createPipe(pipeData)).rejects.toThrow('Database connection failed')
			expect(mockPipeRepository.findByName).toHaveBeenCalledWith('error-pipe')
		})

		test('should throw error when version service fails', async () => {
			const pipeData: CreatePipeDTO = {
				name: 'version-error-pipe',
				description: 'Version error description',
				version: '1.0.0',
			}

			const mockPipe = {
				id: 1,
				name: 'version-error-pipe',
				description: 'Version error description',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const versionError = new Error('Version creation failed')

			mockPipeRepository.findByName.mockResolvedValue(null)
			mockPipeRepository.create.mockResolvedValue(mockPipe)
			mockVersionService.createVersion.mockRejectedValue(versionError)

			await expect(service.createPipe(pipeData)).rejects.toThrow('Version creation failed')
		})
	})
}) 
