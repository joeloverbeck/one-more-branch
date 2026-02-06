import express, { Express } from 'express';
import path from 'path';
import { storyEngine } from '../engine';
import { router } from './routes';

export function createApp(): Express {
  const app = express();

  storyEngine.init();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../../public')));

  app.use('/', router);

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createApp();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`One More Branch running at http://localhost:${port}`);
  });
}
