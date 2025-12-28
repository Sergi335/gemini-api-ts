/* eslint-disable @typescript-eslint/no-extraneous-class */
import { YoutubeTranscript } from 'youtube-transcript'
import { AudioDownloadService } from './audioDownloadService'
import { OpenAIService } from './openAIService'

export class YouTubeService {
  /**
     * Fetches the transcript for a given YouTube URL.
     * Returns the concatenated text of the transcript.
     */
  static async getTranscript (url: string): Promise<string> {
    try {
      console.log(`[YouTubeService] Fetching transcript for URL: ${url}`)
      const transcriptItems = await YoutubeTranscript.fetchTranscript(url)
      const fullText = transcriptItems.map(item => item.text).join(' ')

      if (fullText.trim() === '') {
        throw new Error('Transcript is empty')
      }

      console.log(`[YouTubeService] Transcript fetched successfully. Length: ${fullText.length} characters.`)
      return fullText
    } catch (error) {
      console.warn(`[YouTubeService] Failed to fetch official transcript: ${(error as Error).message}. Attempting fallback with Whisper...`)

      try {
        const audioPath = await AudioDownloadService.download(url)
        console.log(`[YouTubeService] Audio downloaded to: ${audioPath}. Transcribing...`)

        const text = await OpenAIService.transcribe(audioPath)
        console.log(`[YouTubeService] Whisper transcription successful. Length: ${text.length} characters.`)

        // Clean up
        await AudioDownloadService.cleanup(audioPath)

        return text
      } catch (fallbackError) {
        console.error('[YouTubeService] Fallback mechanism failed:', fallbackError)
        // If fallback also fails, throw the original error or a clearer one
        throw new Error('Failed to fetch transcript from YouTube (Captions and Whisper fallback both failed).')
      }
    }
  }
}
