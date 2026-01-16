import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { generateDraft } from '@/lib/llm'
import { sendSlackNotification, sendEmailNotification } from '@/lib/notifications'
import { uploadToGCS } from '@/lib/gcs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("Zendesk Intake: Payload Received", JSON.stringify(body, null, 2))
    
    // Expected Payload: { ticket: { id, subject, description, tags, priority, status } }
    const { ticket } = body

    if (!ticket || !ticket.id || !ticket.description) {
      console.error("Zendesk Intake: Invalid Payload", body)
      return NextResponse.json({ error: 'Invalid payload: Missing ticket data' }, { status: 400 })
    }

    console.log(`Zendesk Ticket Received: #${ticket.id} - ${ticket.subject}`)

    // 0. Deduplication Check (Idempotency)
    const existing = await client.fetch(`*[_type == "newsItem" && description == $desc][0]._id`, {
        desc: `Imported from Zendesk Ticket #${ticket.id}`
    })

    if (existing) {
        console.log(`Duplicate Webhook for Ticket #${ticket.id}. Already processed as ${existing}. Skipping.`)
        // IMPORTANT: Return success to stop Zendesk from retrying
        return NextResponse.json({ success: true, docId: existing, message: 'Already processed' })
    }

    let rawText = ''
    let gcsUrl = ''

    // 1. Check for Attachment
    if (ticket.attachmentUrl && ticket.attachmentUrl.startsWith('http')) {
        console.log(`Processing Attachment: ${ticket.attachmentUrl}`)
        
        // Determine Extension
        let extension = 'pdf' // default
        if (ticket.attachmentUrl.toLowerCase().includes('.docx')) {
            extension = 'docx'
        } else if (ticket.attachmentUrl.toLowerCase().includes('.doc')) {
            extension = 'doc'
        }

        const filename = `zendesk/${ticket.id}-${Date.now()}.${extension}`
        
        // Upload to GCS
        try {
            console.log(`Attempting GCS Upload for: ${filename}`)
            gcsUrl = await uploadToGCS(ticket.attachmentUrl, filename)
            console.log(`Uploaded Attachment to GCS: ${gcsUrl}`)
            
            // Extract Text (OCR)
            const { extractTextFromDocument } = await import('@/lib/ocr')
            const bucketName = process.env.GCS_BUCKET_NAME || ''
            const contentType = extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
            rawText = await extractTextFromDocument(bucketName, filename, contentType)
            console.log("OCR Success, text length:", rawText.length)

        } catch (err: any) {
            console.error("File Processing Failed (Falling back to description):", err)
            // Fallback to description if file fails
            rawText = ticket.description
        }

    } else {
        // Fallback: Use Description
        console.log("No valid attachment found. Using Ticket Description.")
        rawText = ticket.description
    }

    // 2. Generate AI Draft
    console.log(`Generating AI Draft for Ticket #${ticket.id}`)
    const aiText = await generateDraft(rawText)

    // 3. Format Portable Text
    const blocks = aiText.split('\n\n').filter(p => p.trim()).map(p => ({
      _type: 'block',
      _key: Math.random().toString(36).substring(7),
      children: [{ _type: 'span', _key: Math.random().toString(36).substring(7), text: p }],
      markDefs: [],
      style: 'normal'
    }))

    // 4. Create News Item in Sanity
    const doc = await client.create({
      _type: 'newsItem',
      title: ticket.subject,
      description: `Imported from Zendesk Ticket #${ticket.id}`, 
      aiContent: blocks,
      status: 'needs_review',
      source: 'api',
      author: 'Zendesk',
      history: [{
        action: 'imported',
        by: 'Zendesk Webhook',
        timestamp: new Date().toISOString()
      }],
      comments: [{
        author: 'System',
        message: `Imported from Zendesk Ticket #${ticket.id}. ${gcsUrl ? 'Source File: ' + gcsUrl : 'Source: Ticket Description'}`,
        postedAt: new Date().toISOString()
      }]
    })

    console.log(`Created Sanity Document: ${doc._id}`)

    // 5. Notifications
    try {
        const slackMessage = `🚨 *New Zendesk Import* 🚨\n\n🎫 *Ticket:* #${ticket.id} - ${ticket.subject}\n🤖 *Status:* Draft Generated\n🔗 *Edit in Studio:* <http://localhost:3000/studio/structure/newsItem;${doc._id}|Open Editor>`
        await sendSlackNotification(slackMessage)

        if (process.env.EDITOR_EMAIL) {
             const emailHtml = `
            <h2>New Zendesk Import</h2>
            <p><strong>Ticket:</strong> #${ticket.id}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            ${gcsUrl ? `<p><strong>Source File:</strong> <a href="${gcsUrl}">Download</a></p>` : ''}
            <br/>
            <p><a href="http://localhost:3000/studio/structure/newsItem;${doc._id}" style="padding: 10px 20px; background-color: #228b22; color: white; text-decoration: none; border-radius: 5px;">Open Editor</a></p>
          `
          await sendEmailNotification(process.env.EDITOR_EMAIL, `[Zendesk] New Import: ${ticket.subject}`, emailHtml)
        }
    } catch (e) {
        console.error("Notification Error:", e)
    }

    return NextResponse.json({ success: true, docId: doc._id })

  } catch (error: any) {
    console.error("Zendesk Intake Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
