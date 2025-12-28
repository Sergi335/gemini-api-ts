/* eslint-disable @typescript-eslint/no-extraneous-class */
import { Innertube, UniversalCache } from 'youtubei.js'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

export class AudioDownloadService {
  private static innertube: Innertube | null = null

  private static async getInnertube (): Promise<Innertube> {
    if (this.innertube === null) {
      this.innertube = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true
      })
    }
    return this.innertube
  }

  static async download (url: string): Promise<string> {
    try {
      console.log(`[AudioDownloadService] Initializing download for URL: ${url}`)
      const innertube = await this.getInnertube()

      // Extract video ID from URL
      const videoId = url.split('v=')[1]?.split('&')[0]
      if (videoId === undefined || videoId === '') {
        throw new Error('Invalid YouTube URL')
      }

      console.log(`[AudioDownloadService] Video ID resolved: ${String(videoId)}. Starting download with fallback strategy...`)

      const clients = ['IOS', 'WEB'] as const
      let info: any = null
      let lastError: Error | null = null

      for (const client of clients) {
        try {
          console.log(`[AudioDownloadService] Attempting to fetch info with client: ${client}`)
          info = await innertube.getInfo(videoId, { client })
          console.log(`[AudioDownloadService] Info retrieved with ${client} client. Title: ${String(info.basic_info.title ?? 'unknown')}`)
          break // Success
        } catch (error) {
          console.warn(`[AudioDownloadService] Failed with client ${client}:`, (error as Error).message)
          lastError = error as Error
        }
      }

      if (info === null) {
        throw new Error(`All download attempts failed. Last error: ${String(lastError?.message ?? 'Unknown error')}`)
      }

      // Download stream
      const stream = await info.download({
        type: 'audio',
        quality: 'best',
        format: 'mp4' // Whisper supports m4a/mp4
      })

      const tempDir = os.tmpdir()
      const filePath = path.join(tempDir, `${String(videoId)}_${Date.now()}.m4a`)

      console.log(`[AudioDownloadService] Writing stream to temp file: ${filePath}`)

      const fileStream = fs.createWriteStream(filePath)

      // youtubei.js returns a ReadableStream (web standard), need to convert to Node stream or iterate
      // But Innertube's download returns a stream that is essentially async iterable

      for await (const chunk of stream) {
        fileStream.write(chunk)
      }

      fileStream.end()

      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => resolve(true))
        fileStream.on('error', reject)
      })

      console.log(`[AudioDownloadService] Download complete. File saved at: ${filePath}`)
      return filePath
    } catch (error) {
      console.error('[AudioDownloadService] Error downloading audio:', error)
      throw new Error(`Failed to download audio: ${(error as Error).message}`)
    }
  }

  static async cleanup (filePath: string): Promise<void> {
    try {
      if (filePath !== '' && await fs.pathExists(filePath)) {
        await fs.unlink(filePath)
        console.log(`[AudioDownloadService] Temp file deleted: ${filePath}`)
      }
    } catch (error) {
      console.error(`[AudioDownloadService] Error deleting file ${String(filePath)}:`, error)
    }
  }
}
