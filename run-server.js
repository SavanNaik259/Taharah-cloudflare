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
      return res.redirect(decodeURIComponent(imageUrl));
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
                  if (!u || typeof u !== 'string') return u;
                  const bucket = 'studio-7642357109-d9026.firebasestorage.app';
                  
                  // If it's already a full firebasestorage URL, just return it
                  if (u.includes('firebasestorage.googleapis.com')) {
                    // Extract the actual URL if it was wrapped in a proxy
                    if (u.includes('/api/image-proxy?url=')) {
                      try {
                        const uObj = new URL(u, 'http://localhost');
                        const urlParam = uObj.searchParams.get('url');
                        if (urlParam) return urlParam;
                      } catch(e) {}
                    }
                    return u;
                  }

                  // Handle legacy and relative paths
                  let path = u;
                  if (u.includes('?path=')) {
                    try {
                      const uObj = new URL(u, 'http://localhost');
                      path = uObj.searchParams.get('path') || u;
                    } catch(e) {}
                  }
                  
                  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                  const finalPath = cleanPath.startsWith('productImages/') ? cleanPath : `productImages/${cleanPath}`;
                  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(finalPath)}?alt=media`;
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
