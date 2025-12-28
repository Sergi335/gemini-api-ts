/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Response } from 'express'
import { linkModel } from '../models/linkModel'
import { AIService } from '../services/aiService'
import { YouTubeService } from '../services/youtubeService'
import { RequestWithUser } from '../types/express'
import { constants } from '../utils/constants'

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

      const linkDoc = link as any // Still need this for now as Document is generic
      console.log(linkDoc.name)

      // 2. Check/Get Transcript
      let transcript = typeof linkDoc.transcript === 'string' ? linkDoc.transcript : ''
      const url = typeof linkDoc.url === 'string' ? linkDoc.url : ''
      const type = typeof linkDoc.type === 'string' ? linkDoc.type : ''

      if (transcript !== '') {
        console.log('[AIController] Using existing transcript from database.')
      }

      if (transcript === '' && url !== '' && type === 'video') {
        const fetchUrl = String(url)
        process.stdout.write(`[AIController] Transcript missing. Fetching from YouTube for URL: ${fetchUrl}... `)
        try {
          transcript = await YouTubeService.getTranscript(linkDoc.url)
          // Save transcript
          await linkModel.updateLink({
            updates: [{
              id,
              user,
              fields: { transcript }
            }]
          })
        } catch (error) {
          console.error('[AIController] Error during transcript fetch or update:', error)
          return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'Failed to fetch transcript. Video might be restricted or lack captions.' })
        }
      }

      if (transcript === undefined || transcript === null || transcript === '') {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No transcript available for this link.' })
      }

      // 3. Generate Summary
      const summary = await AIService.generateSummary(transcript)

      // 4. Save Summary
      const updatedLink = await linkModel.updateLink({
        updates: [{
          id,
          user,
          fields: { summary }
        }]
      })

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
      const transcript = typeof linkDoc.transcript === 'string' ? linkDoc.transcript : ''

      if (transcript === '') {
        return res.status(400).json({ ...constants.API_FAIL_RESPONSE, error: 'No transcript available. Please summarize the video first to fetch the transcript.' })
      }

      const history = Array.isArray(linkDoc.chatHistory) ? linkDoc.chatHistory : []

      // 2. Chat
      const responseText = await AIService.chat(transcript, history, message)

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
          fields: { chatHistory: newHistory } as any // Type casting to bypass strict type check for now if needed
        }]
      })

      return res.status(200).json({ ...constants.API_SUCCESS_RESPONSE, data: { answer: responseText, history: newHistory } })
    } catch (error) {
      console.error('Error in chatWithLink:', error)
      return res.status(500).json({ ...constants.API_FAIL_RESPONSE, error: 'Internal server error' })
    }
  }
}
