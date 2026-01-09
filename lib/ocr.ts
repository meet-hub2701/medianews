import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Initialize Client
const client = new DocumentProcessorServiceClient({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_PROJECT_ID,
});

/**
 * Extracts text from a PDF stored in Google Cloud Storage.
 * @param bucketName The GCS bucket name
 * @param fileName The path to the file in the bucket
 * @returns The extracted text
 */
export async function extractTextFromPDF(bucketName: string, fileName: string): Promise<string> {
  const processorId = process.env.DOCAI_PROCESSOR_ID;
  const location = 'us'; // Or 'eu', must match where you created the processor
  const projectId = process.env.GCP_PROJECT_ID;

  if (!processorId) throw new Error("Missing DOCAI_PROCESSOR_ID in environment variables");

  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  // The specific file in GCS
  const gcsUri = `gs://${bucketName}/${fileName}`;

  const request = {
    name,
    gcsDocument: {
      gcsUri,
      mimeType: 'application/pdf',
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
