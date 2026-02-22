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

app.all('/api/:functionName', async (req, res) => {
  const functionName = req.params.functionName;
  
    if (functionName === 'image-proxy') {
    let imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('Missing URL');
    
    try {
      imageUrl = decodeURIComponent(imageUrl);
      
      // Fix potential double-encoding or malformed Firebase URLs
      if (imageUrl.includes('firebasestorage.googleapis.com') && !imageUrl.includes('?alt=media')) {
        imageUrl += (imageUrl.includes('?') ? '&' : '?') + 'alt=media';
      }

      console.log(`[Local Proxy] Fetching: ${imageUrl}`);
      
      const fetchResponse = await fetch(imageUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        timeout: 15000
      });
      
      if (!fetchResponse.ok) {
        console.error(`[Local Proxy] Failed: ${fetchResponse.status} for ${imageUrl}`);
        // If it's a 400 from Firebase, it might be a permission or path issue
        // We redirect as a fallback, but the browser will likely fail too
        return res.redirect(imageUrl);
      }
      
      res.setHeader('Content-Type', fetchResponse.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const buffer = await fetchResponse.buffer();
      return res.send(buffer);
    } catch (e) {
      console.error(`[Local Proxy] Error:`, e.message);
      try { return res.redirect(imageUrl); } catch (err) { return res.status(500).send(e.message); }
    }
  }

  const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
  if (!fs.existsSync(functionPath)) return res.status(404).json({ success: false, error: 'Function not found' });

  try {
    delete require.cache[require.resolve(functionPath)];
    const netlifyFunction = require(functionPath);
    const event = {
      queryStringParameters: req.query,
      headers: req.headers,
      body: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
      httpMethod: req.method,
      path: req.path
    };
    
    const result = await netlifyFunction.handler(event, {});
    if (result.headers) Object.keys(result.headers).forEach(k => res.setHeader(k, result.headers[k]));
    
    res.status(result.statusCode || 200);
    if (result.body) {
      if (result.isBase64Encoded) {
        res.send(Buffer.from(result.body, 'base64'));
      } else {
        try { 
          const parsed = JSON.parse(result.body);
          if (functionName === 'load-products' && parsed.products) {
             const bucket = 'studio-7642357109-d9026.firebasestorage.app';
             parsed.products = parsed.products.map(p => {
                const transform = (u) => {
                  if (!u) return u;
                  if (typeof u === 'string' && u.includes('/.netlify/functions/image-proxy')) {
                    try {
                      const uObj = new URL(u, 'http://localhost');
                      const pParam = uObj.searchParams.get('path');
                      if (pParam) {
                        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(pParam)}?alt=media`;
                      }
                    } catch(e) {}
                  }
                  if (typeof u === 'string' && u.includes('firebasestorage')) {
                    if (u.includes('/api/image-proxy?url=')) {
                        try {
                            const uObj = new URL(u, 'http://localhost');
                            const urlParam = uObj.searchParams.get('url');
                            if (urlParam) return urlParam;
                        } catch(e) {}
                    }
                    return u;
                  }
                  return u;
                };
                const newP = { ...p };
                if (newP.image) newP.image = transform(newP.image);
                if (newP.mainImage) newP.mainImage = transform(newP.mainImage);
                if (newP.imageUrl) newP.imageUrl = transform(newP.imageUrl);
                if (newP.images) newP.images = newP.images.map(img => typeof img === 'string' ? transform(img) : (img.url ? {...img, url: transform(img.url)} : img));
                return newP;
             });
          }
          res.json(parsed); 
        } catch (e) { res.send(result.body); }
      }
    } else { res.end(); }
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/:page', (req, res, next) => {
  const p = req.params.page;
  if (p.startsWith('api') || p.startsWith('.netlify') || p.includes('.')) return next();
  const f = path.join(__dirname, `${p}.html`);
  if (fs.existsSync(f)) return res.sendFile(f);
  next();
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on ${PORT}`));
