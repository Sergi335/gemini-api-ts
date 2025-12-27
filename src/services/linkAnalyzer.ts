/* eslint-disable @typescript-eslint/no-extraneous-class */

export class LinkAnalyzer {
  static analyze (url: string): 'video' | 'article' | 'general' {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      // Video platforms
      const videoDomains = [
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'vimeo.com',
        'www.vimeo.com',
        'dailymotion.com',
        'www.dailymotion.com',
        'twitch.tv',
        'www.twitch.tv',
        'tiktok.com',
        'www.tiktok.com'
      ]

      if (videoDomains.some(domain => hostname.includes(domain))) {
        return 'video'
      }

      // Article platforms / blogging sites
      const articleDomains = [
        'medium.com',
        'dev.to',
        'substack.com',
        'hashnode.com',
        'hackernoon.com'
      ]

      if (articleDomains.some(domain => hostname.includes(domain))) {
        return 'article'
      }

      // Default
      return 'general'
    } catch (error) {
      // If URL parsing fails, default to general
      return 'general'
    }
  }
}
