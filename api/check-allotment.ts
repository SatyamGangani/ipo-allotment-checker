import type { IncomingMessage, ServerResponse } from 'http';
import { handleCheckAllotment } from '../server/registrarProxy.ts';

async function parseBody(req: IncomingMessage): Promise<any> {
  const potentialBody = (req as any).body;
  if (potentialBody !== undefined && potentialBody !== null) {
    if (typeof potentialBody === 'string') {
      try {
        return JSON.parse(potentialBody);
      } catch {
        return {};
      }
    }
    return potentialBody;
  }

  return new Promise((resolve) => {
    const chunks: any[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(bodyStr || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set standard CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    return await handleCheckAllotment(body, res);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Malformed JSON payload', canRetry: false }));
  }
}
