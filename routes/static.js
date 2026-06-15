import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Channel from '../lib/channel.js';

const PLACEHOLDER = '<!-- {{templates}} -->';
const fileCache = new Map();

const loadCache = async (staticDir) => {
  const componentsDir = path.join(staticDir, 'components');
  const indexPath = path.join(staticDir, 'index.html');
  const [indexHtml, files] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readdir(componentsDir),
  ]);
  const htmlFiles = files.filter((f) => f.endsWith('.html')).sort();
  const readHtml = (f) => readFile(path.join(componentsDir, f), 'utf8');
  const parts = await Promise.all(htmlFiles.map(readHtml));
  const data = Buffer.from(indexHtml.replace(PLACEHOLDER, parts.join('\n')));
  fileCache.set(indexPath, data);
};

const serveFile = async (res, filePath) => {
  if (!fileCache.has(filePath)) {
    try {
      fileCache.set(filePath, await readFile(filePath));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        new Channel(null, res).notFound();
        return;
      }
      throw error;
    }
  }
  res.writeHead(200, { 'Content-Type': Channel.contentType(filePath) });
  res.end(fileCache.get(filePath));
};

export default { loadCache, serveFile };
