import { Response } from 'express'
import { linkModel } from '../models/linkModel'
import { AIService } from '../services/aiService'
import { LinkAnalyzer } from '../services/linkAnalyzer'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'
import * as stripeService from '../services/stripeService'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AIController {
  static async summarizeLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      console.log(`[AIController] Received summarize request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      // 1. Get Link
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

      // Robust type detection
      let type = typeof linkDoc.type === 'string' ? linkDoc.type : ''
      if (type !== 'video') {
        type = LinkAnalyzer.analyze(url)
        console.log(`[AIController] Re-analyzed link type: ${String(type)}`)
      }

      const isYouTube = (Boolean(url.includes('youtube.com'))) || (Boolean(url.includes('youtu.be')))

      // 2. Generate Summary
      let summary: string
      if ((type === 'video' || isYouTube) && url !== '') {
        console.log(`[AIController] Summarizing video directly via URL: ${String(url)}`)
        summary = await AIService.summarizeVideo(url)
      } else {
        if (transcript === '') {
          return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No transcript available for this link.' })
        }
        summary = await AIService.generateSummary(transcript)
      }

      // 3. Save Summary
      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { summary }
        }]
      })

      // 4. Increment LLM calls
      const email = req.user?.email
      if (email != null) {
        const incrementResult = await stripeService.incrementLlmCalls(email)
        if (!incrementResult.success) {
          console.warn(`[AIController] Failed to increment LLM calls for ${email}: ${incrementResult.error ?? 'Unknown error'}`)
          // We don't block the response if incrementing fails, but we log it
        }
      }

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: updatedLink })
    } catch (error) {
      console.error('Error in summarizeLink:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }

  static async chatWithLink (req: RequestWithUser, res: Response): Promise<Response> {
    try {
      const user = String(req.user?._id ?? 'unknown')
      const { id } = req.params
      const { message } = req.body
      console.log(`[AIController] Received chat request for link ID: ${id} by user: ${user}`)

      if (user === undefined || user === null || user === '') {
        return res.status(401).json({ ...constants.API_FAIL_RESPONSE, error: constants.API_NOT_USER_MESSAGE })
      }

      if (message === undefined || message === null || message === '') {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Message is required' })
      }

      // 1. Get Link
      const link = await linkModel.getLinkById({ user, id })
      if (link === null || link === undefined || 'error' in link) {
        return res.status(404).json({ ...constants.API_FAIL_RESPONSE, error: 'Link not found' })
      }

      const linkDoc = link as any
      const url = typeof linkDoc.url === 'string' ? linkDoc.url as string : ''
      const transcript = typeof linkDoc.transcript === 'string' ? linkDoc.transcript as string : ''
      const history = Array.isArray(linkDoc.chatHistory) ? linkDoc.chatHistory as Array<{ role: 'user' | 'model', content: string }> : []

      // Robust type detection
      let type = typeof linkDoc.type === 'string' ? linkDoc.type as string : ''
      if (type !== 'video') {
        type = LinkAnalyzer.analyze(url)
        console.log(`[AIController] Re-analyzed link type for chat: ${type}`)
      }

      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

      // 2. Chat
      let responseText: string
      if ((type === 'video' || isYouTube) && url !== '') {
        console.log(`[AIController] Chatting with video directly via URL: ${url}`)
        responseText = await AIService.chatWithVideo(url, history, message)
      } else {
        if (transcript === '') {
          return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No transcript available. Please summarize the article first.' })
        }
        responseText = await AIService.chat(transcript, history, message)
      }

      // 3. Update History
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

      // 4. Increment LLM calls
      const email = req.user?.email
      if (email != null) {
        const incrementResult = await stripeService.incrementLlmCalls(email)
        if (!incrementResult.success) {
          console.warn(`[AIController] Failed to increment LLM calls for ${email}: ${incrementResult.error ?? 'Unknown error'}`)
        }
      }

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: { answer: responseText, history: newHistory } })
    } catch (error) {
      console.error('Error in chatWithLink:', error)
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

      // 1. Update Link to clear summary and chatHistory
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
