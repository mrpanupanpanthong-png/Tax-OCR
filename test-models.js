// Run this with: node test-models.js
// to list all available Gemini models for your API key

const API_KEY = 'AIzaSyCHC5MP-HNoCEhoKT0sGjcj-UW2hvBNNmE';

async function listModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  );
  const data = await res.json();
  
  if (data.error) {
    console.error('Error:', data.error);
    return;
  }

  console.log('\n=== Available Models that support generateContent ===\n');
  
  const filtered = (data.models || []).filter(m => 
    m.supportedGenerationMethods?.includes('generateContent')
  );
  
  filtered.forEach(m => {
    console.log(`- ${m.name.replace('models/', '')}  (${m.displayName})`);
  });
  
  console.log(`\nTotal: ${filtered.length} models`);
}

listModels().catch(console.error);
