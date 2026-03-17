import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the client. Ensure GEMINI_API_KEY is defined in your environment variables.
// In Next.js, use process.env.GEMINI_API_KEY
// Initialize the client with default library settings.
// Force v1 as v1beta shows 'expired' error for some API keys/projects
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '', { apiVersion: 'v1' });

/**
 * Extracts specific tax information from an invoice image/pdf using Gemini 2.5 Flash.
 * @param {string} fileUrl - URL of the file (signed URL from Supabase) to process.
 * @param {Object} clientContext - Information about the active client (accounting firm's customer).
 * @param {string} clientContext.name - Name of the client company.
 * @param {string} clientContext.taxId - Tax ID of the client company.
 * @returns {Promise<Object>} The extracted structured JSON.
 */
export async function extractInvoiceData(fileUrl, clientContext = {}) {
  const { name: clientName, taxId: clientTaxId } = clientContext;

  try {
    // 1. Fetch the file from the provided URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine mime type
    const mimeType = response.headers.get('content-type') || 'application/pdf';

    // 2. Define the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `
      You are an expert tax accountant. Extract the tax invoice information from this document.
      
      CRITICAL CONTEXT:
      - Current Today's Year: 2026
      - Document processed for client: "${clientName || 'Unknown'}" (Tax ID: ${clientTaxId || 'Unknown'}).
      
      RULES FOR DATE (invoice_date):
      - Format: "YYYY-MM-DD"
      - Be EXTREMELY careful with the YEAR. 
      - If the year is in Thai Buddhist Era (B.E.) (e.g., 2569, 2568), convert it to A.D. (e.g., 2026, 2025) by subtracting 543.
      - If the year is 2 digits (e.g., "01/03/26"), interpret "26" as 2026 (A.D.) based on the current context.
      - Do NOT confuse "26" with "23". Double-check the pixels to ensure accuracy.
      - If the year is written as "69", it is likely B.E. (2569), so convert to 2026 A.D.
      
      RULES FOR TAX TYPE (invoice_type):
      - If the client ("${clientName}") is the SELLER (Issuer of the invoice), set "invoice_type" to "sale" (Output Tax).
      - If the client ("${clientName}") is the BUYER (Recipient of the invoice), set "invoice_type" to "purchase" (Input Tax).
      - Look at the company names and Tax IDs on the document to make this determination.

      RULES FOR BRANCH (branch):
      - Extract the branch information (e.g., "00000", "0001").
      - If it is "Head Office" or "00000", represent it as "สำนักงานใหญ่".
      
      Return JSON in this format as an ARRAY OF OBJECTS (even if there is only 1 invoice):
      [
        {
          "vendor_name": "string (the other party, not the client)",
          "tax_id": "string (the other party's tax ID)",
          "branch": "string (e.g. 'สำนักงานใหญ่' or '00001')",
          "invoice_no": "string",
          "invoice_date": "YYYY-MM-DD",
          "total_amount": number,
          "vat_amount": number,
          "net_amount": number,
          "invoice_type": "purchase" | "sale",
          "confidence_score_percent": number,
          "field_confidence": {
            "vendor_name": number,
            "tax_id": number,
            "branch": number,
            "invoice_no": number,
            "invoice_date": number,
            "total_amount": number
          }
        }
      ]
    `;

    // 3. Generate Content with a 45-second timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI extraction timed out after 45 seconds')), 45000);
    });

    const extractionPromise = model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const result = await Promise.race([extractionPromise, timeoutPromise]);

    const text = result.response.text();
    const extractedData = JSON.parse(text);
    
    return {
      success: true,
      data: extractedData,
      raw_response: text,
    };

  } catch (error) {
    console.error('Error during Gemini extraction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
