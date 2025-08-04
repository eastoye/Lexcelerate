// api/saveCatalogue.js

// ⚠️ For Bolt.new preview only — hard-coded token.
// Remove this and switch to process.env.AIRTABLE_API_KEY before any real deploy!
const AIRTABLE_API_KEY = 'patytJhnMGmt8Qv9z.1422fd014db0cc195f5e67178a453465174fd47e792faf703f34653eed60acc7';
const BASE_ID          = 'appm9iGdIBKGBzzeF';
const TABLE_NAME       = 'Table%201'; // URL encoded "Table 1"

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ error:'Method not allowed' }));
  }

  const { uid, wordCatalogue } = req.body;
  if (!uid || !Array.isArray(wordCatalogue)) {
    res.writeHead(400, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ error:'Missing uid or invalid wordCatalogue' }));
  }

  // Build body
  const payload = {
    records: [
      {
        fields: {
          uid,
          wordCatalogue: JSON.stringify(wordCatalogue),
          lastUpdated: new Date().toISOString()
        }
      }
    ]
  };

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
  console.log('🔧 Airtable save URL:', url);
  console.log('📤 Payload:', payload);

  try {
    const airtableRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await airtableRes.text();
    console.log('📊 Airtable save status:', airtableRes.status);
    console.log('📝 Airtable save body:', text);

    if (!airtableRes.ok) {
      res.writeHead(500, { 'Content-Type':'application/json' });
      return res.end(JSON.stringify({
        error: `Airtable save failed (${airtableRes.status})`,
        body: text
      }));
    }

    const data = JSON.parse(text);
    res.writeHead(200, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ result: data }));
  } catch (err) {
    console.error('🔥 saveCatalogue exception:', err);
    res.writeHead(500, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ error: err.message }));
  }
}
