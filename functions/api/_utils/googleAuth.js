export function extractPemKey(raw) {
  if (!raw) throw new Error('FIREBASE_PRIVATE_KEY missing');

  let key = raw.trim();

  // If the key is wrapped in quotes (common in some env var setups), strip them
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // If full JSON was provided, extract private_key
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch (e) {}
  }

  // Convert escaped newlines (\n) to actual newlines
  key = key.replace(/\\n/g, '\n').trim();

  // Strip header/footer + all whitespace (including newlines) to get pure base64
  const clean = key
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  if (!clean || clean.length < 100) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
  }

  // Fix padding for base64
  const padded = clean.padEnd(Math.ceil(clean.length / 4) * 4, '=');
  
  try {
    return atob(padded);
  } catch (e) {
    throw new Error('Base64 decode failed for FIREBASE_PRIVATE_KEY. Ensure the key is valid.');
  }
}
