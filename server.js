import 'dotenv/config';
// Simple development server
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(body);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

const server = createServer((req, res) => {
  // Handle API routes
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // Serve static files from docs directory
  let filePath = join(__dirname, 'docs', req.url === '/' ? 'index.html' : req.url);
  
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  try {
    const content = readFileSync(filePath);
    const ext = filePath.split('.').pop();
    
    const mimeTypes = {
      'html': 'text/html',
      'js': 'application/javascript',
      'css': 'text/css',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };

    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } catch (error) {
    res.writeHead(500);
    res.end('Server Error');
  }
});

async function handleApiRequest(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse request body for POST requests
  if (req.method === 'POST') {
    try {
      await parseBody(req);
    } catch (error) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
  }

  try {
    if (req.url === '/api/saveCatalogue') {
      const { default: handler } = await import('./api/saveCatalogue.js');
      await handler(req, res);
    } else if (req.url.startsWith('/api/loadCatalogue')) {
      const { default: handler } = await import('./api/loadCatalogue.js');
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      req.query = Object.fromEntries(url.searchParams);
      await handler(req, res);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

const PORT = process.env.PORT || 3000;

// Function to find available port
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.listen(startPort, () => {
      const port = testServer.address().port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Start server on available port
findAvailablePort(PORT).then(availablePort => {
  server.listen(availablePort, () => {
    console.log(`Server running at http://localhost:${availablePort}`);
    console.log('Make sure to set your AIRTABLE_API_KEY environment variable');
  });
});