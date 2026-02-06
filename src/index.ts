/**
 * One More Branch - Interactive Branching Storytelling Application
 * Entry point
 */

import { loadConfig } from './config/index.js';
import { startServer } from './server/index.js';

export function bootstrap(): void {
  // Load configuration first - fail fast if invalid
  loadConfig();

  // Start the server
  startServer();
}

if (require.main === module) {
  bootstrap();
}
