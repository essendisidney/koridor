import type { VercelRequest, VercelResponse } from '@vercel/node';

// Compiled Nest bootstrap (built by nest build before deploy)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const handler = require('../dist/src/serverless.js').default as (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;

export default handler;
