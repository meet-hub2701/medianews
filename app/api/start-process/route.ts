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
    const filename = `uploads/${_id}-${Date.now()}.pdf`
    const gcsUrl = await uploadToGCS(fileUrl, filename)
    console.log(`Uploaded to GCS: ${gcsUrl}`)

    // 2. Update Sanity with GCS Link
    // We add a note to the 'auditLog' or description to prove it happened
    await client.patch(_id).set({
      description: `Archived to GCS: ${gcsUrl}`, 
      // In a real high-volume app, we might trigger a Cloud Function here.
      // For now, we just mark it as "Processed by Next.js"
    }).commit()

    return NextResponse.json({ success: true, gcsUrl })
  } catch (error: any) {
    console.error('Processing Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
