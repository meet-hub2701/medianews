import { NextResponse } from 'next/server'
import { uploadToGCS } from '@/lib/gcs'
import { client } from '@/lib/sanity'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { _id, fileUrl } = body

    if (!_id || !fileUrl) {
      return NextResponse.json({ error: 'Missing _id or fileUrl' }, { status: 400 })
    }

    console.log(`Processing Job: ${_id}`)

    // 1. Upload to GCS
    // We strictly follow the plan: Upload file to Google Cloud Storage.
    const filename = `uploads/${_id}-${Date.now()}.pdf`
    const gcsUrl = await uploadToGCS(fileUrl, filename)
    console.log(`Uploaded to GCS: ${gcsUrl}`)

    // 2. Extract Text using Google Document AI
    console.log(`Starting OCR for: ${filename}`)
    const { extractTextFromPDF } = await import('@/lib/ocr')
    const bucketName = process.env.GCS_BUCKET_NAME || ''
    
    // Fallback to placeholder if credentials are missing locally, but try OCR first
    let rawText = ''
    try {
        rawText = await extractTextFromPDF(bucketName, filename)
        console.log("OCR Success, text length:", rawText.length)
    } catch (e: any) {
        console.error("OCR Failed:", e)
        rawText = `[OCR Failed] Could not read PDF. Error: ${e.message}`
    }

    // 3. Generate AI Draft
    console.log(`Generating Draft for: ${_id}`)
    const { generateDraft } = await import('@/lib/llm')
    const aiText = await generateDraft(rawText)

    // 4. Format for Sanity (Simple Block Structure)
    const blocks = aiText.split('\n\n').filter(p => p.trim()).map(p => ({
      _type: 'block',
      _key: Math.random().toString(36).substring(7),
      children: [{ _type: 'span', _key: Math.random().toString(36).substring(7), text: p }],
      markDefs: [],
      style: 'normal'
    }))

    // 5. Update Sanity
    await client.patch(_id).set({
      description: `Archived to GCS: ${gcsUrl}`,
      aiContent: blocks,
      status: 'needs_review'
    }).commit()

    console.log(`Sanity Updated: ${_id}`)

    return NextResponse.json({ success: true, gcsUrl, aiText })
  } catch (error: any) {
    console.error('Processing Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Allow browser testing (GET Request)
export async function GET() {
  return NextResponse.json({ status: 'API Online', message: 'Send a POST request to this endpoint.' })
}
