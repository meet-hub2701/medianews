import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import mammoth from 'mammoth';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

// Initialize Client
const client = new DocumentProcessorServiceClient({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_PROJECT_ID,
});

export async function extractTextFromDocument(bucketName: string, fileName: string, contentType: string): Promise<string> {

  // 1. Handle DOCX using Mammoth (Free, Local)
  if (contentType.includes('word') || contentType.includes('docx')) {
      console.log(`Processing DOCX with Mammoth: ${fileName}`);
      try {
          const bucket = storage.bucket(bucketName);
          const file = bucket.file(fileName);
          const [fileBuffer] = await file.download();
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          return result.value || "";
      } catch (err) {
          console.error("Mammoth Extraction Failed:", err);
          throw new Error("Failed to extract text from DOCX");
      }
  }

  // 2. Handle PDF using Google Document AI (Paid)
  const processorId = process.env.DOCAI_PROCESSOR_ID;
  const location = 'us'; 
  const projectId = process.env.GCP_PROJECT_ID;

  if (!processorId) throw new Error("Missing DOCAI_PROCESSOR_ID in environment variables");

  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const gcsUri = `gs://${bucketName}/${fileName}`;

  const request = {
    name,
    gcsDocument: {
      gcsUri,
      mimeType: 'application/pdf', // Force PDF for DocAI
    },
  };

  console.log(`Sending Document AI Request: ${gcsUri}`);

  try {
    const [result] = await client.processDocument(request);
    const { document } = result;
    const text = document?.text || '';
    return text;
  } catch (error) {
    console.error('Document AI Error:', error);
    throw new Error('Failed to process document with Google Document AI');
  }
}
