import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity'
import { generateDraft } from '@/lib/llm'
import { sendSlackNotification, sendEmailNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Expected Payload: { ticket: { id, subject, description, tags, priority, status } }
    const { ticket } = body

    if (!ticket || !ticket.id || !ticket.description) {
      return NextResponse.json({ error: 'Invalid payload: Missing ticket data' }, { status: 400 })
    }

    console.log(`Zendesk Ticket Received: #${ticket.id} - ${ticket.subject}`)

    // 1. Generate AI Draft from Description (No OCR needed as it's already text)
    console.log(`Generating AI Draft for Ticket #${ticket.id}`)
    const aiText = await generateDraft(ticket.description)

    // 2. Format Portable Text
    const blocks = aiText.split('\n\n').filter(p => p.trim()).map(p => ({
      _type: 'block',
      _key: Math.random().toString(36).substring(7),
      children: [{ _type: 'span', _key: Math.random().toString(36).substring(7), text: p }],
      markDefs: [],
      style: 'normal'
    }))

    // 3. Create News Item in Sanity
    const doc = await client.create({
      _type: 'newsItem',
      title: ticket.subject,
      // Store original description separately or just as description field? 
      // Current schema description is optional string.
      description: `Imported from Zendesk Ticket #${ticket.id}`, 
      aiContent: blocks,
      status: 'needs_review',
      source: 'api', // Matches schema options
      author: 'Zendesk',
      history: [{
        action: 'imported',
        by: 'Zendesk Webhook',
        timestamp: new Date().toISOString()
      }],
      comments: [{
        author: 'System',
        message: `Imported from Zendesk Ticket #${ticket.id}. Original Priority: ${ticket.priority}`,
        postedAt: new Date().toISOString()
      }]
    })

    console.log(`Created Sanity Document: ${doc._id}`)

    // 4. Notifications
    try {
        const slackMessage = `🚨 *New Zendesk Import* 🚨\n\n🎫 *Ticket:* #${ticket.id} - ${ticket.subject}\n🤖 *Status:* Draft Generated\n🔗 *Edit in Studio:* <http://localhost:3000/studio/structure/newsItem;${doc._id}|Open Editor>`
        await sendSlackNotification(slackMessage)

        if (process.env.EDITOR_EMAIL) {
             const emailHtml = `
            <h2>New Zendesk Import</h2>
            <p><strong>Ticket:</strong> #${ticket.id}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
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
