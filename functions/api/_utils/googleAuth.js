export function extractPemKey(raw) {
  if (!raw) throw new Error('FIREBASE_PRIVATE_KEY missing');

  let key = raw.trim();

  // If full JSON was provided, extract private_key
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch (e) {
      // Not JSON or parse failed, continue with raw
    }
  }

  // Convert escaped newlines
  key = key.replace(/\\n/g, '\n').trim();

  // If no PEM header, wrap it
  if (!key.includes('BEGIN')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----\n`;
  }

  // Strip header/footer + whitespace
  const clean = key
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  if (!clean || clean.length < 100) {
    throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
  }

  // Fix padding for base64
  const padded = clean.padEnd(Math.ceil(clean.length / 4) * 4, '=');
  return atob(padded);
}
