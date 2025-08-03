// Backend API endpoint to save catalogue to Airtable
const AIRTABLE_API_KEY = 'patYnEVoObhelX4uf.cc77a892ec2881021a4621b37c288521d6430fda53f3cee42f74881c45978f0e';
const BASE_ID = 'appr8D2hvSbwcNU8N';
const TABLE_NAME = 'WordCatalogues';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (!AIRTABLE_API_KEY) {
    res.writeHead(500, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ error: 'Airtable API key not configured' }));
  }

  try {
    const { uid, email, wordCatalogue } = req.body;

    if (!uid || !wordCatalogue) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({ error: 'Missing required fields' }));
    }

    // First, check if a record exists for this user
    const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula={uid}="${uid}"`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Airtable search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    const recordData = {
      fields: {
        uid: uid,
        email: email || '',
        wordCatalogue: JSON.stringify(wordCatalogue),
        lastUpdated: new Date().toISOString()
      }
    };

    let result;
    
    if (searchData.records && searchData.records.length > 0) {
      // Update existing record
      const recordId = searchData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${recordId}`;
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });

      if (!updateResponse.ok) {
        throw new Error(`Airtable update failed: ${updateResponse.status}`);
      }

      result = await updateResponse.json();
    } else {
      // Create new record
      const createUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [recordData] })
      });

      if (!createResponse.ok) {
        throw new Error(`Airtable create failed: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      result = createData.records[0];
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ 
      success: true, 
      recordId: result.id,
      message: 'Catalogue saved successfully' 
    }));

  } catch (error) {
    console.error('Error saving to Airtable:', error);
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ 
      error: 'Failed to save catalogue',
      details: error.message 
    }));
  }
}