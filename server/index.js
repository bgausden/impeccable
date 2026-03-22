import { createReadStream, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSkills,
  getCommands,
  getCommandSource,
  getPatterns,
  handleFileDownload,
  handleBundleDownload
} from './lib/api-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const port = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.zip': 'application/zip',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

function sendJson(res, data, status = 200) {
  setSecurityHeaders(res);
  res.writeHead(status, { 'Content-Type': MIME_TYPES['.json'] });
  res.end(JSON.stringify(data));
}

async function sendWebResponse(res, response) {
  setSecurityHeaders(res);

  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  res.statusCode = response.status;

  if (!response.body) {
    res.end();
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

async function serveFile(res, relativePath) {
  if (relativePath.includes('..')) {
    setSecurityHeaders(res);
    res.writeHead(400, { 'Content-Type': MIME_TYPES['.txt'] });
    res.end('Bad Request');
    return;
  }

  const normalized = relativePath.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': MIME_TYPES['.txt'] });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  setSecurityHeaders(res);
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/') {
    await serveFile(res, 'index.html');
    return;
  }

  if (pathname === '/cheatsheet') {
    await serveFile(res, 'cheatsheet.html');
    return;
  }

  if (pathname === '/api/skills') {
    sendJson(res, await getSkills());
    return;
  }

  if (pathname === '/api/commands') {
    sendJson(res, await getCommands());
    return;
  }

  if (pathname === '/api/patterns') {
    sendJson(res, await getPatterns());
    return;
  }

  const commandSourceMatch = pathname.match(/^\/api\/command-source\/([a-z0-9_-]+)$/);
  if (commandSourceMatch) {
    const result = await getCommandSource(commandSourceMatch[1]);
    if (result?.error) {
      sendJson(res, { error: result.error }, result.status);
      return;
    }
    if (!result) {
      sendJson(res, { error: 'Command not found' }, 404);
      return;
    }
    sendJson(res, { content: result });
    return;
  }

  const bundleMatch = pathname.match(/^\/api\/download\/bundle\/([a-z0-9_-]+)$/);
  if (bundleMatch) {
    await sendWebResponse(res, await handleBundleDownload(bundleMatch[1]));
    return;
  }

  const fileMatch = pathname.match(/^\/api\/download\/([a-z]+)\/([a-z0-9-]+)\/([a-z0-9_-]+)$/);
  if (fileMatch) {
    const [, type, provider, id] = fileMatch;
    await sendWebResponse(res, await handleFileDownload(type, provider, id));
    return;
  }

  const staticPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  await serveFile(res, staticPath);
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error('Server error:', error);
    setSecurityHeaders(res);
    res.writeHead(500, { 'Content-Type': MIME_TYPES['.txt'] });
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`🎨 impeccable.style running at http://localhost:${port}`);
});
