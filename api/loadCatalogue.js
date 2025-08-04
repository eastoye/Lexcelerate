// api/loadCatalogue.js

// ⚠️ For Bolt.new preview only — hard-coded token.
// Remove this and switch to process.env.AIRTABLE_API_KEY before any real deploy!
const AIRTABLE_API_KEY = 'patytJhnMGmt8Qv9z.1422fd014db0cc195f5e67178a453465174fd47e792faf703f34653eed60acc7';
const BASE_ID          = 'appm9iGdIBKGBzzeF';
const TABLE_NAME       = 'Table%201'; // URL encoded "Table 1"

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const { uid } = req.query;
  if (!uid) {
    res.writeHead(400, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ error:'Missing uid parameter' }));
  }

  // Build filter formula: note curly braces around field name
  const formula     = encodeURIComponent(`{uid}="${uid}"`);
  const url         = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${formula}`;
  console.log('🔎 Airtable URL:', url);

  try {
    const airtableRes = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const text = await airtableRes.text();
    console.log('📊 Airtable status:', airtableRes.status);
    console.log('📝 Airtable body:', text);

    if (!airtableRes.ok) {
      res.writeHead(500, { 'Content-Type':'application/json' });
      return res.end(JSON.stringify({
        error: `Airtable request failed (${airtableRes.status})`,
        body: text
      }));
    }

    const data = JSON.parse(text);
    // field storing JSON string must match your column name; adjust if yours is "WordCatalogues"
    const recordJson = data.records[0]?.fields?.wordCatalogue;
    const wordCatalogue = recordJson ? JSON.parse(recordJson) : [];

    res.writeHead(200, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ wordCatalogue }));
  } catch (err) {
    console.error('🔥 loadCatalogue exception:', err);
    res.writeHead(500, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({ error: err.message }));
  }
}
