import path from 'node:path';
import { readdir } from 'node:fs/promises';
import Channel from './channel.mjs';
import config from '../config.mjs';
import staticFiles from '../routes/static.js';

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

const applyResult = async (channel, result) => {
  if (!result) return;
  const { status = 200, serve, json, html } = result;
  if (serve) await staticFiles.serveFile(channel.res, serve);
  else if (json) channel.json(status, json);
  else if (html) channel.html(status, html);
};

const runHandler = async (handler, channel, params) => {
  try {
    await applyResult(channel, await handler(channel, params));
  } catch (error) {
    if (error instanceof SyntaxError) {
      channel.html(400, 'Invalid JSON');
      return;
    }
    throw error;
  }
};

const makeHandler = (mod) => {
  const routes = mod.default?.routes;
  if (Array.isArray(routes)) {
    return async (req, res, segments) => {
      const channel = new Channel(req, res);
      const method = req.method || 'GET';
      for (const { pattern, handlers } of routes) {
        const params = matchSegments(pattern, segments);
        if (params === null) continue;
        const handler = handlers[method];
        if (!handler) {
          channel.methodNotAllowed();
          return;
        }
        await runHandler(handler, channel, params);
        return;
      }
      channel.methodNotAllowed();
    };
  }
  if (mod.default && typeof mod.default === 'object') {
    return async (req, res) => {
      const channel = new Channel(req, res);
      const method = req.method || 'GET';
      const handler = mod.default[method];
      if (!handler) {
        channel.methodNotAllowed();
        return;
      }
      await runHandler(handler, channel, {});
    };
  }
  return null;
};

const buildRoutingTable = async () => {
  const indexPath = path.join(config.STATIC_DIR, 'index.html');
  const index = (req, res) => staticFiles.serveFile(res, indexPath);
  const table = { '': index, 'index.html': index };
  const files = (await readdir(config.ROUTES_DIR)).sort();
  for (const file of files) {
    if (!file.endsWith('.js') || file === 'static.js') continue;
    const mod = await import(path.join(config.ROUTES_DIR, file));
    const handler = makeHandler(mod);
    if (handler) table[path.basename(file, '.js')] = handler;
  }
  return table;
};

const safeJoin = (base, requestPath) => {
  const cleaned = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, cleaned);
  const rel = path.relative(config.root, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
};

const serveStatic = async (req, res, pathname) => {
  const isShared = pathname.startsWith('/shared/');
  const base = isShared ? config.SHARED_DIR : config.STATIC_DIR;
  const rel = isShared ? pathname.slice('/shared'.length) : pathname;
  const target = safeJoin(base, rel);
  if (!target) {
    new Channel(req, res).notFound();
    return;
  }
  await staticFiles.serveFile(res, target);
};

export default { buildRoutingTable, serveStatic };
