const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = 'AIzaSyDtPteM5Cigy5_UGNpFM.B.NNK8DAtdmrU'; // Wait, I see I pasted correctly?
  // Let me re-pasted from the correct value to be absolutely sure
}
// I'll just use the variable from user
const apiKey = 'AIzaSyDtPteM5Cigy5_UGNpFMfBbNNK8DAtdmrU';

async function run() {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = 'gemini-2.5-flash';
  
  try {
    console.log(`Testing model: ${modelName} via SDK...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you 2.5?");
    const response = await result.response;
    console.log(`[OK] ${modelName} responded: ${response.text().substring(0, 50)}...`);
  } catch (e) {
    console.log(`[FAIL] ${modelName}: ${e.message}`);
  }
}

run();
