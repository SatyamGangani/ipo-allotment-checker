import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In standalone mode, dynamically import the middleware or handlers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3000;

async function start() {
  let apiMiddleware;
  try {
    // When built with tsx or node, import middleware
    const mod = await import('./middleware.js').catch(() => import('./middleware.ts'));
    apiMiddleware = mod.apiMiddleware;
  } catch (e) {
    console.error('Could not load apiMiddleware:', e);
  }

  const server = http.createServer((req, res) => {
    // Delegate to API middleware if /api
    if (req.url && req.url.startsWith('/api') && apiMiddleware) {
      return apiMiddleware(req, res, () => {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });
    }

    // Serve static files from dist
    const cleanUrl = req.url.split('?')[0];
    let filePath = path.join(distDir, cleanUrl === '/' ? 'index.html' : cleanUrl);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found. Please run npm run build first.');
    }
  });

  server.listen(PORT, () => {
    console.log(`[IPO Check] Server running at http://localhost:${PORT}`);
  });
}

start();
