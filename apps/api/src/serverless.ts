import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Express } from 'express';
import { createKoridorApp } from './create-app';

let expressApp: Express | undefined;
let ready: Promise<void> | undefined;

async function ensureApp() {
  if (!ready) {
    ready = (async () => {
      const server = express();
      const created = await createKoridorApp(server);
      await created.app.init();
      expressApp = created.express;
    })();
  }
  await ready;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureApp();
  expressApp!(req, res);
}
