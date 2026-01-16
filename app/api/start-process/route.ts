import { NextResponse } from 'next/server'
import { uploadToGCS } from '@/lib/gcs'
import { client } from '@/lib/sanity'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    let { _id, fileUrl } = body

    // Handle Manual Trigger from Studio (Look up the file URL)
    if (fileUrl === 'LOOKUP_IN_SANITY') {
        console.log("Manual Trigger detected. Fetching file URL from Sanity...")
        const doc = await client.fetch(`*[_id == $_id][0]{ 'url': originalDoc.asset->url }`, { _id })
        
        if (!doc || !doc.url) {
            return NextResponse.json({ error: 'No file found in Sanity document' }, { status: 400 })
        }
        fileUrl = doc.url
        console.log(`Resolved File URL: ${fileUrl}`)
        
        // Update Source field to 'manual' if not set
        await client.patch(_id).setIfMissing({ source: 'manual' }).commit()
    } else {
         // Default to Zapier source
         await client.patch(_id).setIfMissing({ source: 'zapier' }).commit()
    }

    if (!_id || !fileUrl) {
      return NextResponse.json({ error: 'Missing _id or fileUrl' }, { status: 400 })
    }

    console.log(`Processing Job: ${_id}`)

    // 1. Upload to GCS
    const filename = `uploads/${_id}-${Date.now()}.pdf`
    const gcsUrl = await uploadToGCS(fileUrl, filename)
    console.log(`Uploaded to GCS: ${gcsUrl}`)

    // 2. Extract Text (PDF or DOCX)
    console.log(`Starting Text Extraction for: ${filename}`)
    const { extractTextFromDocument } = await import('@/lib/ocr')
    const bucketName = process.env.GCS_BUCKET_NAME || ''
    
    // Determine Content Type from extension
    const isWord = filename.toLowerCase().endsWith('.doc') || filename.toLowerCase().endsWith('.docx')
    const contentType = isWord ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'

    let rawText = ''
    try {
        rawText = await extractTextFromDocument(bucketName, filename, contentType)
        console.log("Extraction Success, text length:", rawText.length)
        
    } catch (e: any) {
        console.error("Extraction Failed:", e)
        rawText = `[Extraction Failed] Could not read document. Error: ${e.message}`
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

    // 6. Send Notifications (Slack & Email)
    try {
        const { sendSlackNotification, sendEmailNotification } = await import('@/lib/notifications')
        
        // Slack
        const slackMessage = `🚨 *New Article Ready for Review* 🚨\n\n📄 *File:* ${filename}\n🤖 *Status:* AI Draft Generated\n🔗 *Edit in Studio:* <http://localhost:3000/studio/structure/newsItem;${_id}|Open Editor>`
        await sendSlackNotification(slackMessage)

        // Email
        const editorEmail = process.env.EDITOR_EMAIL
        if (editorEmail) {
          const emailSubject = `[Action Required] New Draft by AI: ${filename}`
          const emailHtml = `
            <h2>New Article Ready for Review</h2>
            <p><strong>File:</strong> ${filename}</p>
            <p><strong>Status:</strong> AI Draft Generated</p>
            <br/>
            <a href="http://localhost:3000/studio/structure/newsItem;${_id}" style="padding: 10px 20px; background-color: #228b22; color: white; text-decoration: none; border-radius: 5px;">Open Editor</a>
          `
          await sendEmailNotification(editorEmail, emailSubject, emailHtml)
        }
    } catch (notifyErr) {
        console.error("Notification failed:", notifyErr)
    }

    return NextResponse.json({ success: true, gcsUrl, aiText })
  } catch (error: any) {
    console.error('Processing Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'API Online', message: 'Send a POST request to this endpoint.' })
}
