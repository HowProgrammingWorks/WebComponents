import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { loadCache, serveFile } from './routes/static.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.join(__dirname, 'static');
const SHARED_DIR = path.join(__dirname, 'shared');
const PROFILE_DIR = path.join(__dirname, 'data', 'profile');
const ROUTES_DIR = path.join(__dirname, 'routes');
const HOST = '127.0.0.1';
const PORT = 8000;

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8' };

const sendJson = (res, status, payload) => {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
};

const parseJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  return JSON.parse(raw);
};

const insideProject = (candidatePath) => {
  const rel = path.relative(__dirname, candidatePath);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

const safeJoin = (base, requestPath) => {
  const cleaned = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, cleaned);
  return insideProject(full) ? full : null;
};

const ctx = {
  profileDir: PROFILE_DIR,
  staticDir: STATIC_DIR,
  sendJson,
  parseJsonBody,
  serveFile,
};

const serveStatic = async (res, pathname) => {
  const isShared = pathname.startsWith('/shared/');
  const base = isShared ? SHARED_DIR : STATIC_DIR;
  const rel = isShared ? pathname.slice('/shared'.length) : pathname;
  const target = safeJoin(base, rel);
  if (!target) {
    res.writeHead(404, TEXT_HEADERS);
    res.end('Not found');
    return;
  }
  await serveFile(res, target);
};

const methodNotAllowed = (res) => {
  res.writeHead(405, TEXT_HEADERS);
  res.end('Method not allowed');
};

const matchSegments = (pattern, segments) => {
  const pp = pattern.split('/');
  if (pp.length !== segments.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = segments[i];
    else if (pp[i] !== segments[i]) return null;
  }
  return params;
};

const makeHandler = (mod) => {
  if (Array.isArray(mod.routes)) {
    return async (req, res, segments) => {
      const method = req.method || 'GET';
      for (const { pattern, handlers } of mod.routes) {
        const params = matchSegments(pattern, segments);
        if (params === null) continue;
        const handler = handlers[method];
        if (!handler) {
          methodNotAllowed(res);
          return;
        }
        await handler(req, res, params, ctx);
        return;
      }
      methodNotAllowed(res);
    };
  }
  if (mod.default && typeof mod.default === 'object') {
    return async (req, res) => {
      const method = req.method || 'GET';
      const handler = mod.default[method];
      if (!handler) {
        methodNotAllowed(res);
        return;
      }
      await handler(req, res, {}, ctx);
    };
  }
  return null;
};

const buildRoutingTable = async () => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  const route = (req, res) => serveFile(res, indexPath);
  const table = { '': route, 'index.html': route };
  const files = (await readdir(ROUTES_DIR)).sort();
  for (const file of files) {
    if (!file.endsWith('.js') || file === 'static.js') continue;
    const mod = await import(path.join(ROUTES_DIR, file));
    const handler = makeHandler(mod);
    if (handler) table[path.basename(file, '.js')] = handler;
  }
  return table;
};

await loadCache(STATIC_DIR);
const routingTable = await buildRoutingTable();

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400, TEXT_HEADERS);
      res.end('Bad request');
      return;
    }
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const segments = url.pathname.split('/');
    const route = routingTable[segments[1]];
    if (route) {
      await route(req, res, segments);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: 'Unexpected server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
