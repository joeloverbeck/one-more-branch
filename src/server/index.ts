import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/index.js';
import { storyEngine } from '../engine';
import { errorHandler } from './middleware/error-handler';
import { router } from './routes';

export function createApp(): Express {
  const app = express();
  const distPublicPath = path.join(__dirname, '../public');
  const rootPublicPath = path.join(__dirname, '../../public');
  const staticPublicPath = fs.existsSync(distPublicPath) ? distPublicPath : rootPublicPath;

  storyEngine.init();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(staticPublicPath));

  app.use('/', router);
  app.use(errorHandler);

  return app;
}

export function startServer(port?: number): void {
  const app = createApp();
  const serverPort = port ?? getConfig().server.port;

  app.listen(serverPort, () => {
    // eslint-disable-next-line no-console
    console.log(`One More Branch running at http://localhost:${serverPort}`);
  });
}
