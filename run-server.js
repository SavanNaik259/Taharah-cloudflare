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
  
  // Hardcoded Razorpay Keys for Cloudflare/Local consistency
  const RAZORPAY_KEY_ID = "rzp_live_SG2nO8SrQyBF6r";
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
  
  if (functionName === 'image-proxy') {
      let imageUrl = req.query.url;
      if (!imageUrl) return res.status(400).send('Missing URL');
      
      let decodedUrl = decodeURIComponent(imageUrl);
      console.log(`[Proxy Request] Original: ${imageUrl} | Decoded: ${decodedUrl}`);
      
      // Handle nested proxy URLs or legacy Netlify paths
      if (decodedUrl.includes('image-proxy?path=')) {
        const parts = decodedUrl.split('path=');
        decodedUrl = decodeURIComponent(parts[parts.length - 1]);
        console.log(`[Proxy Nested] Extracted path: ${decodedUrl}`);
      }
      
      // If it's a relative path, convert to direct Firebase URL
      if (!decodedUrl.startsWith('http')) {
        const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
        let cleanPath = decodedUrl.startsWith('/') ? decodedUrl.substring(1) : decodedUrl;
        
        // Final path cleanup
        const finalPath = (cleanPath.includes('/') || cleanPath.startsWith('productImages')) ? cleanPath : `productImages/${cleanPath}`;
        
        const encodedPath = finalPath.split('/').map(part => encodeURIComponent(part)).join('%2F');
        decodedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
        console.log(`[Proxy Construct] Path: ${finalPath} | URL: ${decodedUrl}`);
      } else if (decodedUrl.includes('firebasestorage.googleapis.com') && !decodedUrl.includes('alt=media')) {
          decodedUrl += (decodedUrl.includes('?') ? '&' : '?') + 'alt=media';
      }

      // Handle old Netlify URLs by extracting the filename and routing through proxy
      if (decodedUrl.includes('netlify.app/productImages/')) {
          const parts = decodedUrl.split('/productImages/');
          const filename = parts[parts.length - 1].split('?')[0];
          const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
          decodedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/productImages%2F${encodeURIComponent(filename)}?alt=media`;
          console.log(`[Proxy Netlify Fallback] Filename: ${filename} | URL: ${decodedUrl}`);
      }

      return res.redirect(decodedUrl);
    }

  if (functionName === 'debug-env') {
    return res.json({
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "NOT_SET",
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "NOT_SET",
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "NOT_SET",
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "NOT_SET"
    });
  }

  const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
  if (!fs.existsSync(functionPath)) return res.status(404).json({ success: false, error: 'Function not found' });

  try {
    delete require.cache[require.resolve(functionPath)];
    const netlifyFunction = require(functionPath);
    
    // Inject hardcoded keys into process.env for the function execution
    process.env.RAZORPAY_KEY_ID = "rzp_live_SG2nO8SrQyBF6r";
    // RAZORPAY_KEY_SECRET is already in process.env from the environment or should be left to be picked up from there

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
             const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
             parsed.products = parsed.products.map(p => {
                const transform = (u) => {
                  if (!u || typeof u !== 'string') return u;
                  const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'studio-7642357109-d9026.firebasestorage.app';
                  
                  // If it's already a full firebasestorage URL, just return it
                  if (u.includes('firebasestorage.googleapis.com')) {
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
                  
                  // Convert relative paths or extracted paths to direct Firebase URLs
                  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                  const finalPath = cleanPath.startsWith('productImages/') ? cleanPath : `productImages/${cleanPath}`;
                  
                  // SYNC WITH LOCAL: Use direct public URL without proxy
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
