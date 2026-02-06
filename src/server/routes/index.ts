import { Router } from 'express';

export const router = Router();

// Placeholder routes until later USEINT tickets are implemented.
router.get('/', (_req, res) => {
  res.status(200).send('One More Branch - Coming Soon');
});
