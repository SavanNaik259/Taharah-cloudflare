const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('.'));

// Local API Proxy for Development
app.all('/api/:functionName', async (req, res) => {
  const functionName = req.params.functionName;
  console.log(`[Local API Proxy] Routing to: ${functionName}`);

  // Handle image-proxy specially for local dev
  if (functionName === 'image-proxy') {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('Missing URL');
    
    try {
      const decodedUrl = decodeURIComponent(imageUrl);
      const response = await fetch(decodedUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.error(`[Local Proxy] Fetch failed for ${decodedUrl}: ${response.status}`);
        return res.status(response.status).send('Fetch failed');
      }
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      const buffer = await response.buffer();
      return res.send(buffer);
    } catch (e) {
      console.error(`[Local Proxy] Error:`, e);
      return res.status(500).send(e.message);
    }
  }

  // Generic routing to Netlify functions for local dev
  const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
  if (!fs.existsSync(functionPath)) {
    console.error(`[Local API Proxy] Function not found: ${functionPath}`);
    return res.status(404).json({ success: false, error: 'Function not found locally' });
  }

  try {
    const netlifyFunction = require(functionPath);
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      body: JSON.stringify(req.body),
      httpMethod: req.method,
      path: req.path
    };
    
    const result = await netlifyFunction.handler(event, {});
    
    if (result.headers) {
      Object.keys(result.headers).forEach(key => res.setHeader(key, result.headers[key]));
    }
    
    res.status(result.statusCode || 200);
    if (result.body) {
      if (result.isBase64Encoded) {
        res.send(Buffer.from(result.body, 'base64'));
      } else {
        try { 
          res.json(JSON.parse(result.body)); 
        } catch (e) { 
          res.send(result.body); 
        }
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error(`[Local API Proxy] Error execution:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve HTML files without .html extension
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  if (page.startsWith('api') || page.startsWith('.netlify')) return next();
  const filePath = path.join(__dirname, `${page}.html`);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Taharah Dev Server running on port ${PORT}`);
});
