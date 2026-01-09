import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini with API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

/**
 * Generates a news draft from the extracted text using Gemini.
 * @param text The raw text extracted from the PDF
 * @returns The AI-generated article text
 */
export async function generateDraft(text: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Returning mock response.")
    return "This is a mock AI response because GEMINI_API_KEY was not set."
  }

  try {
    const prompt = `
      You are an expert news editor. Rewrite the following press release into a professional, journalistic news article.
      Focus on facts, clarity, and AP style.
      
      Original Text:
      ${text.substring(0, 30000)} // Limit to avoid token overflow if huge
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error("Gemini Error:", error)
    return "Error generating content. Please check logs."
  }
}
