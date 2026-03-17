const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function checkModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    // Note: The SDK doesn't have a direct listModels, we usually use the REST API for that
    // but we can try common names
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log(`Checking ${modelName}...`);
            // Minimal test
            await model.generateContent("Hello");
            console.log(`[SUCCESS] ${modelName} is available.`);
        } catch (e) {
            console.log(`[FAILED] ${modelName}: ${e.message}`);
        }
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

checkModels();
