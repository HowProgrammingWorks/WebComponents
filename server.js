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
    const routeName = segments[1];
    const route = routes[routeName];
    if (route) {
      await route(req, res, segments);
      return;
    }
    await router.serveStatic(req, res, pathname);
  } catch (error) {
    channel.serverError(error);
  }
}).listen(config.PORT, config.HOST, () => {
  const { HOST, PORT } = config;
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
