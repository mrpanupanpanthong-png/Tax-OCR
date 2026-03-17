const apiKey = 'AIzaSyDtPteM5Cigy5_UGNpFMfBbNNK8DAtdmrU';

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (!res.ok) {
      const errBody = await res.json();
      console.log(`[ERROR] HTTP ${res.status}: ${JSON.stringify(errBody)}`);
      return;
    }
    const data = await res.json();
    console.log(`[SUCCESS] Models found: ${data.models?.length || 0}`);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

listModels();
