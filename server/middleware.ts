import type { IncomingMessage, ServerResponse } from 'http';
import { handleGetIpos, handleCheckAllotment } from './registrarProxy.ts';

export function apiMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const url = req.url || '';

  // Only handle /api routes
  if (!url.startsWith('/api')) {
    return next();
  }

  // Set standard CORS headers for local / cross-origin web client
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cleanPath = url.split('?')[0];

  if (req.method === 'GET' && (cleanPath === '/api/ipos' || cleanPath === '/api/ipos/')) {
    return handleGetIpos(res);
  }

  if (req.method === 'POST' && (cleanPath === '/api/check-allotment' || cleanPath === '/api/check-allotment/')) {
    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        const body = JSON.parse(bodyStr || '{}');
        handleCheckAllotment(body, res);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Malformed JSON payload', canRetry: false }));
      }
    });
    return;
  }

  // Health check endpoint
  if (cleanPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  next();
}
