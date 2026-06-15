import { createServer } from 'node:http';

import config from './config.js';
import Channel from './lib/channel.js';
import router from './lib/router.js';
import staticFiles from './routes/static.js';

await staticFiles.loadCache(config.STATIC_DIR);
const routes = await router.loadRoutes();

createServer(async (req, res) => {
  const channel = new Channel(req, res);
  try {
    if (!req.url) return void channel.badRequest();
    const pathname = req.url.split('?')[0];
    const segments = pathname.split('/');
    const route = routes[segments[1]];
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
