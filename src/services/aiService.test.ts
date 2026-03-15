import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from './aiService'

// Mock GoogleGenAI
const mockGenerateContentStream = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContentStream: mockGenerateContentStream
    }
  }))
}))

describe('AIService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' }
    mockGenerateContentStream.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should stream summary successfully', async () => {
    mockGenerateContentStream.mockResolvedValue((async function * () {
      yield { text: 'Part 1 ' }
      yield { text: 'Part 2' }
    })())

    const chunks: string[] = []
    const result = await AIService.generateSummaryStream('verify text', (chunk) => {
      chunks.push(chunk)
    })

    expect(result).toBe('Part 1 Part 2')
    expect(chunks).toEqual(['Part 1 ', 'Part 2'])
    expect(mockGenerateContentStream).toHaveBeenCalled()
  })

  it('should stream chat successfully', async () => {
    mockGenerateContentStream.mockResolvedValue((async function * () {
      yield { text: 'Hola ' }
      yield { text: 'mundo' }
    })())

    const chunks: string[] = []
    const result = await AIService.chatStream('context', [], 'msg', (chunk) => {
      chunks.push(chunk)
    })

    expect(result).toBe('Hola mundo')
    expect(chunks).toEqual(['Hola ', 'mundo'])
    expect(mockGenerateContentStream).toHaveBeenCalled()
  })

  it('should throw error if API key is missing', async () => {
    process.env.GEMINI_API_KEY = ''
    await expect(AIService.generateSummaryStream('text', vi.fn())).rejects.toThrow('GEMINI_API_KEY is not set')
  })
})
