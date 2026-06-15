import { createServer } from 'node:http';

import config from './config.mjs';
import Channel from './lib/channel.mjs';
import router from './lib/router.mjs';
import staticFiles from './routes/static.js';

await staticFiles.loadCache(config.STATIC_DIR);
const routingTable = await router.buildRoutingTable();

createServer(async (req, res) => {
  const channel = new Channel(req, res);
  try {
    if (!req.url) return void channel.badRequest();
    const pathname = req.url.split('?')[0];
    const segments = pathname.split('/');
    const route = routingTable[segments[1]];
    if (route) {
      await route(req, res, segments);
      return;
    }
    await router.serveStatic(req, res, pathname);
  } catch (error) {
    channel.serverError(error);
  }
}).listen(config.PORT, config.HOST, () => {
  console.log(`Server listening on http://${config.HOST}:${config.PORT}`);
});
