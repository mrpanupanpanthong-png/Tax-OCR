const apiKey = 'AIzaSyDtPteM5Cigy5_UGNpFMfBbNNK8DAtdmrU';

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (!res.ok) {
      console.log(`[ERROR] HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    data.models?.forEach(m => {
        console.log(`- ${m.name}`);
    });
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

listModels();
