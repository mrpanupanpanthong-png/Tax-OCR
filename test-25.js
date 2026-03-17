const apiKey = 'AIzaSyDtPteM5Cigy5_UGNpFMfBbNNK8DAtdmrU';

async function test() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, are you Gemini 2.5?" }] }]
      })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`[STATUS] ${status}`);
    console.log(`[RESPONSE] ${JSON.stringify(body).substring(0, 100)}...`);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

test();
