import { Response } from 'express'
import { Types } from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

vi.mock('../models/linkModel')
vi.mock('../services/aiService')
vi.mock('../services/stripeService')

process.env.STRIPE_SECRET_KEY = 'test_key'

const { AIController } = await import('./aiController')
const { linkModel } = await import('../models/linkModel')
const { AIService } = await import('../services/aiService')
const stripeService = await import('../services/stripeService')

const mockUserId = new Types.ObjectId().toHexString()

describe('AIController', () => {
  let mockRequest: Partial<RequestWithUser>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      user: {
        _id: mockUserId,
        email: 'test@example.com',
        name: 'testuser',
        subscription: {
          status: 'active',
          plan: 'PRO',
          cancelAtPeriodEnd: false
        },
        llmCallsThisMonth: 0,
        llmCallsResetAt: new Date()
      },
      params: { id: 'link-123' },
      body: {},
      query: {},
      headers: {}
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      headersSent: false
    }

    vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
      success: true,
      data: {
        allowed: true,
        plan: 'PRO',
        limit: 200,
        currentCount: 0,
        resetAt: new Date()
      }
    })
  })

  it('blocks summarizeLink for FREE users', async () => {
    vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
      success: true,
      data: {
        allowed: false,
        plan: 'FREE',
        limit: 0,
        currentCount: 0,
        resetAt: new Date(),
        statusCode: 403,
        message: 'La IA no está disponible en el plan FREE. Actualiza al plan PRO para usar esta función.'
      }
    })

    await AIController.summarizeLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(linkModel.getLinkById).not.toHaveBeenCalled()
    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...constants.API_FAIL_RESPONSE,
      message: 'La IA no está disponible en el plan FREE. Actualiza al plan PRO para usar esta función.'
    })
  })

  it('blocks chatWithLink when PRO user reached 200 monthly calls', async () => {
    mockRequest.body = { message: 'Hello' }

    vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
      success: true,
      data: {
        allowed: false,
        plan: 'PRO',
        limit: 200,
        currentCount: 200,
        resetAt: new Date(),
        statusCode: 403,
        message: 'Has alcanzado el límite de 200 llamadas de IA en tu periodo de facturación actual. Actualiza tu plan para continuar.'
      }
    })

    await AIController.chatWithLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(linkModel.getLinkById).not.toHaveBeenCalled()
    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...constants.API_FAIL_RESPONSE,
      message: 'Has alcanzado el límite de 200 llamadas de IA en tu periodo de facturación actual. Actualiza tu plan para continuar.'
    })
  })

  it('allows summarizeLink for PRO users below the limit', async () => {
    vi.mocked(linkModel.getLinkById).mockResolvedValue({
      url: 'https://example.com',
      transcript: 'Texto de prueba',
      summary: '',
      type: 'article'
    } as any)
    vi.mocked(AIService.generateSummaryStream).mockImplementation(async (_text, onChunk) => {
      await onChunk('Resumen')
      return 'Resumen'
    })
    vi.mocked(linkModel.updateLink).mockResolvedValue([{ summary: 'Resumen' }] as any)
    vi.mocked(stripeService.incrementLlmCalls).mockResolvedValue({
      success: true,
      data: { count: 1, limit: 200 }
    })

    await AIController.summarizeLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(AIService.generateSummaryStream).toHaveBeenCalledWith('Texto de prueba', expect.any(Function))
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8')
    expect(mockResponse.write).toHaveBeenCalledWith('event: chunk\n')
    expect(mockResponse.write).toHaveBeenCalledWith('data: {"text":"Resumen"}\n\n')
    expect(mockResponse.end).toHaveBeenCalled()
  })

  it('returns existing summary from database without streaming', async () => {
    vi.mocked(linkModel.getLinkById).mockResolvedValue({
      url: 'https://example.com',
      transcript: 'Texto de prueba',
      summary: 'Resumen ya guardado',
      type: 'article'
    } as any)

    await AIController.summarizeLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(AIService.generateSummaryStream).not.toHaveBeenCalled()
    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...constants.API_SUCCESS_RESPONSE,
      data: {
        url: 'https://example.com',
        transcript: 'Texto de prueba',
        summary: 'Resumen ya guardado',
        type: 'article'
      }
    })
    expect(mockResponse.setHeader).not.toHaveBeenCalled()
  })

  it('returns 500 if AI access check fails', async () => {
    vi.mocked(stripeService.getAiAccessDecision).mockResolvedValue({
      success: false,
      error: 'Error checking AI access'
    })

    await AIController.summarizeLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({
      ...constants.API_FAIL_RESPONSE,
      error: 'Error checking AI access'
    })
  })

  it('streams chat response in chunks when requested', async () => {
    mockRequest.body = { message: 'Hello' }

    vi.mocked(linkModel.getLinkById).mockResolvedValue({
      url: 'https://example.com',
      transcript: 'Texto de prueba',
      chatHistory: [],
      type: 'article'
    } as any)

    vi.mocked(AIService.chatStream).mockImplementation(async (_context, _history, _message, onChunk) => {
      await onChunk('Hola ')
      await onChunk('mundo')
      return 'Hola mundo'
    })

    vi.mocked(linkModel.updateLink).mockResolvedValue([{ chatHistory: [] }] as any)
    vi.mocked(stripeService.incrementLlmCalls).mockResolvedValue({
      success: true,
      data: { count: 1, limit: 200 }
    })

    await AIController.chatWithLink(
      mockRequest as RequestWithUser,
      mockResponse as Response
    )

    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8')
    expect(mockResponse.write).toHaveBeenCalledWith('event: chunk\n')
    expect(mockResponse.write).toHaveBeenCalledWith('data: {"text":"Hola "}\n\n')
    expect(mockResponse.write).toHaveBeenCalledWith('data: {"text":"mundo"}\n\n')
    expect(mockResponse.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ answer: 'Hola mundo', history: [{ role: 'user', content: 'Hello' }, { role: 'model', content: 'Hola mundo' }] })}\n\n`)
    expect(mockResponse.end).toHaveBeenCalled()
  })
})
