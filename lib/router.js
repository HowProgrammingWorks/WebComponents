import path from 'node:path';
import { readdir } from 'node:fs/promises';
import Channel from './channel.js';
import config from '../config.js';
import staticFiles from '../routes/static.js';

const applyResult = async (channel, result) => {
  if (!result) return;
  const { status = 200, serve, json, html } = result;
  if (serve) await staticFiles.serveFile(channel.res, serve);
  else if (json) channel.json(status, json);
  else if (html) channel.html(status, html);
};

const isRouteMap = (route) =>
  typeof route === 'object' && route !== null && !Array.isArray(route);

const pickHandler = (route, method, segments) => {
  const depth = segments.length;
  const pick = (entry) => {
    if (!entry) return null;
    return [].concat(entry).find((fn) => fn.length + 1 === depth) ?? null;
  };
  return pick(route[method]) ?? (method === 'PUT' ? pick(route.POST) : null);
};

const hasMethod = (route, method) =>
  Boolean(route[method] || (method === 'PUT' && route.POST));

const makeHandler = (route) => async (req, res, segments) => {
  const channel = new Channel(req, res);
  const method = req.method || 'GET';
  const handler = pickHandler(route, method, segments);
  if (!handler) {
    if (hasMethod(route, method)) channel.notFound();
    else channel.methodNotAllowed();
    return;
  }
  try {
    const args = segments.length > 2 ? segments.slice(2) : [];
    await applyResult(channel, await handler(channel, ...args));
  } catch (error) {
    if (error instanceof SyntaxError) {
      channel.html(400, 'Invalid JSON');
      return;
    }
    throw error;
  }
};

const loadRoutes = async () => {
  const indexPath = path.join(config.STATIC_DIR, 'index.html');
  const index = (req, res) => staticFiles.serveFile(res, indexPath);
  const table = { '': index, 'index.html': index };
  const files = (await readdir(config.ROUTES_DIR)).sort();
  for (const file of files) {
    if (!file.endsWith('.js') || file === 'static.js') continue;
    const mod = await import(path.join(config.ROUTES_DIR, file));
    if (!isRouteMap(mod.default)) continue;
    table[path.basename(file, '.js')] = makeHandler(mod.default);
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

export default { loadRoutes, serveStatic };
