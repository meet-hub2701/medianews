import { Storage } from '@google-cloud/storage'
import { Readable } from 'stream'

// Initialize Storage with credentials from Env
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL,
      // Handle newline characters in private key string
      private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const bucketName = process.env.GCS_BUCKET_NAME || 'sanity-agent-uploads'

/**
 * Uploads a file from a URL to Google Cloud Storage
 * @returns The public URL of the uploaded file
 */
export async function uploadToGCS(fileUrl: string, filename: string): Promise<string> {
  if (!bucketName) throw new Error("GCS_BUCKET_NAME is missing")

  const bucket = storage.bucket(bucketName)
  const file = bucket.file(filename)

  // Fetch the file as a stream
  const response = await fetch(fileUrl)
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
  if (!response.body) throw new Error("File body is empty")

  // Convert WebStream to Node Readable Stream
  // @ts-ignore
  const nodeStream = Readable.fromWeb(response.body)

  return new Promise((resolve, reject) => {
    nodeStream
      .pipe(file.createWriteStream({
        metadata: {
          contentType: response.headers.get('content-type') || 'application/pdf'
        }
      }))
      .on('error', (err) => reject(err))
      .on('finish', async () => {
        // Make simple public URL (assuming bucket is public or signed URL required)
        // For now, we return the gs util URI or public link
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`
        resolve(publicUrl)
      })
  })
}
