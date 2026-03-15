import { Response } from 'express'
import { linkModel } from '../models/linkModel'
import { AIService } from '../services/aiService'
import { LinkAnalyzer } from '../services/linkAnalyzer'
import * as stripeService from '../services/stripeService'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AIController {
  private static getMessageFromBody (req: RequestWithUser): string {
    const body = req.body as { message?: unknown } | undefined
    return typeof body?.message === 'string' ? body.message : ''
  }

  private static initializeStream (res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    ;(res as Response & { flushHeaders: () => void }).flushHeaders()
  }

  private static sendStreamEvent (res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  private static async incrementLlmCallsForUser (email?: string): Promise<void> {
    if (email == null) return

    const incrementResult = await stripeService.incrementLlmCalls(email)
    if (!incrementResult.success) {
      console.warn(`[AIController] Failed to increment LLM calls for ${email}: ${incrementResult.error ?? 'Unknown error'}`)
    }
  }

  private static async validateAiAccess (req: RequestWithUser, res: Response): Promise<Response | null> {
    const email = req.user?.email
    if (email == null || email === '') {
      return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
    }

    const aiAccess = await stripeService.getAiAccessDecision(email)
    if (!aiAccess.success || aiAccess.data == null) {
      return res.status(500).json({
        ...constants.API_FAIL_RESPONSE,
        error: aiAccess.error ?? 'Error checking AI access'
      })
    }

    if (!aiAccess.data.allowed) {
      return res.status(aiAccess.data.statusCode ?? 403).json({
        ...constants.API_FAIL_RESPONSE,
        message: aiAccess.data.message
      })
    }

    return null
  }

  static async summarizeLink (req: RequestWithUser, res: Response): Promise<Response | undefined> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      console.log(`[AIController] Received summarize request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const aiAccessError = await AIController.validateAiAccess(req, res)
      if (aiAccessError != null) {
        return aiAccessError
      }

      const link = await linkModel.getLinkById({ user, id })
      if (link === null || link === undefined || 'error' in link) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Link not found' })
      }

      const linkDoc = link as any
      const url = typeof linkDoc.url === 'string' ? linkDoc.url : ''
      const transcript = typeof linkDoc.transcript === 'string' ? linkDoc.transcript : ''
      const existingSummary = typeof linkDoc.summary === 'string' ? linkDoc.summary : ''

      if (existingSummary !== '') {
        console.log(`[AIController] Returning existing summary for link ID: ${id}`)
        return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: linkDoc })
      }

      AIController.initializeStream(res)

      let type = typeof linkDoc.type === 'string' ? linkDoc.type : ''
      if (type !== 'video') {
        type = LinkAnalyzer.analyze(url)
        console.log(`[AIController] Re-analyzed link type: ${String(type)}`)
      }

      const isYouTube = Boolean(url.includes('youtube.com')) || Boolean(url.includes('youtu.be'))

      let summary: string
      if ((type === 'video' || isYouTube) && url !== '') {
        console.log(`[AIController] Streaming video summary directly via URL: ${String(url)}`)
        summary = await AIService.summarizeVideoStream(url, async (chunk) => {
          AIController.sendStreamEvent(res, 'chunk', { text: chunk })
        })
      } else {
        if (transcript === '') {
          AIController.sendStreamEvent(res, 'error', { error: 'No transcript available for this link.' })
          res.end()
          return
        }
        summary = await AIService.generateSummaryStream(transcript, async (chunk) => {
          AIController.sendStreamEvent(res, 'chunk', { text: chunk })
        })
      }

      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { summary }
        }]
      })

      await AIController.incrementLlmCallsForUser(req.user?.email)
      AIController.sendStreamEvent(res, 'done', { summary, data: updatedLink })
      res.end()
    } catch (error) {
      console.error('Error in summarizeLink:', error)
      if (res.headersSent) {
        AIController.sendStreamEvent(res, 'error', { error: 'Internal server error' })
        res.end()
        return
      }
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }

  static async chatWithLink (req: RequestWithUser, res: Response): Promise<Response | undefined> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      const message = AIController.getMessageFromBody(req)
      console.log(`[AIController] Received chat request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      if (message === undefined || message === null || message === '') {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Message is required' })
      }

      const aiAccessError = await AIController.validateAiAccess(req, res)
      if (aiAccessError != null) {
        return aiAccessError
      }

      const link = await linkModel.getLinkById({ user, id })
      if (link === null || link === undefined || 'error' in link) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Link not found' })
      }

      const linkDoc = link as any
      const url = typeof linkDoc.url === 'string' ? linkDoc.url as string : ''
      const transcript = typeof linkDoc.transcript === 'string' ? linkDoc.transcript as string : ''
      const history = Array.isArray(linkDoc.chatHistory) ? linkDoc.chatHistory as Array<{ role: 'user' | 'model', content: string }> : []

      AIController.initializeStream(res)

      let type = typeof linkDoc.type === 'string' ? linkDoc.type as string : ''
      if (type !== 'video') {
        type = LinkAnalyzer.analyze(url)
        console.log(`[AIController] Re-analyzed link type for chat: ${type}`)
      }

      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

      let responseText: string
      if ((type === 'video' || isYouTube) && url !== '') {
        console.log(`[AIController] Streaming chat with video directly via URL: ${url}`)
        responseText = await AIService.chatWithVideoStream(url, history, message, async (chunk) => {
          AIController.sendStreamEvent(res, 'chunk', { text: chunk })
        })
      } else {
        if (transcript === '') {
          AIController.sendStreamEvent(res, 'error', { error: 'No transcript available. Please summarize the article first.' })
          res.end()
          return
        }
        responseText = await AIService.chatStream(transcript, history, message, async (chunk) => {
          AIController.sendStreamEvent(res, 'chunk', { text: chunk })
        })
      }

      const newHistory = [
        ...history,
        { role: 'user', content: message },
        { role: 'model', content: responseText }
      ]

      await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { chatHistory: newHistory } as any
        }]
      })

      await AIController.incrementLlmCallsForUser(req.user?.email)
      AIController.sendStreamEvent(res, 'done', { answer: responseText, history: newHistory })
      res.end()
    } catch (error) {
      console.error('Error in chatWithLink:', error)
      if (res.headersSent) {
        AIController.sendStreamEvent(res, 'error', { error: 'Internal server error' })
        res.end()
        return
      }
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }

  static async deleteSummaryAndChat (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      console.log(`[AIController] Received delete summary/chat request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: {
            summary: '',
            chatHistory: []
          }
        }]
      })

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedLink })
    } catch (error) {
      console.error('Error in deleteSummaryAndChat:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }

  static async deleteSummary (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      console.log(`[AIController] Received delete summary request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { summary: '' }
        }]
      })

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedLink })
    } catch (error) {
      console.error('Error in deleteSummary:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }

  static async deleteChat (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      console.log(`[AIController] Received delete chat request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { chatHistory: [] } as any
        }]
      })

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedLink })
    } catch (error) {
      console.error('Error in deleteChat:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }
}
