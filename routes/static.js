import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const TEMPLATES_PLACEHOLDER = '<!-- {{templates}} -->';

const fileCache = new Map();

const loadCache = async (staticDir) => {
  const componentsDir = path.join(staticDir, 'components');
  const indexPath = path.join(staticDir, 'index.html');
  const [indexHtml, files] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readdir(componentsDir),
  ]);
  const htmlFiles = files.filter((f) => f.endsWith('.html')).sort();
  const parts = await Promise.all(
    htmlFiles.map((f) => readFile(path.join(componentsDir, f), 'utf8')),
  );
  fileCache.set(
    indexPath,
    Buffer.from(indexHtml.replace(TEMPLATES_PLACEHOLDER, parts.join('\n'))),
  );
};

const serveFile = async (res, filePath) => {
  if (!fileCache.has(filePath)) {
    try {
      fileCache.set(filePath, await readFile(filePath));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      throw error;
    }
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fileCache.get(filePath));
};

export { loadCache, serveFile };
