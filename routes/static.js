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
  const readHtml = (f) => {
    const filePath = path.join(componentsDir, f);
    return readFile(filePath, 'utf8');
  };
  const parts = await Promise.all(htmlFiles.map(readHtml));
  const injected = indexHtml.replace(PLACEHOLDER, parts.join('\n'));
  const data = Buffer.from(injected);
  fileCache.set(indexPath, data);
};

const serveFile = async (res, filePath) => {
  if (!fileCache.has(filePath)) {
    try {
      const contents = await readFile(filePath);
      fileCache.set(filePath, contents);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        new Channel(null, res).notFound();
        return;
      }
      throw error;
    }
  }
  const contentType = Channel.contentType(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fileCache.get(filePath));
};

export default { loadCache, serveFile };
