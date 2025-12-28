
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

const VIDEO_ID = 'Z0yCMsgtXfA'
const URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

function log(message: string) {
  console.log(message)
  fs.appendFileSync(path.join(__dirname, 'results_ytdlp.txt'), message + '\n')
}

async function testYtDlp() {
  log(`\n--- Testing yt-dlp for ${VIDEO_ID} ---`)
  const filePath = path.join(__dirname, `test_ytdlp.m4a`)
  
  // --extract-audio --audio-format m4a
  const command = `yt-dlp -f "bestaudio[ext=m4a]" -o "${filePath}" ${URL}`
  
  log(`[YT-DLP] Running command: ${command}`)
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`[YT-DLP] FAILED: ${error.message}`)
        log(`[YT-DLP] STDERR: ${stderr}`)
        reject(error)
        return
      }
      log(`[YT-DLP] STDOUT: ${stdout}`)
      log(`[YT-DLP] SUCCESS! Saved to ${filePath}`)
      resolve(true)
    })
  })
}

fs.writeFileSync(path.join(__dirname, 'results_ytdlp.txt'), 'Starting YT-DLP Tests...\n')
testYtDlp().catch(console.error)
