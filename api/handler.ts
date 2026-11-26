import { createApiApp } from '../server/app.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

const app = createApiApp({ hosted: true });

export default function handleApi(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/handler') {
    const path = url.searchParams.get('__ct_path');
    // Vercel may pass the rewrite destination as the request URL.
    if (path && !/[?#\\\s]/.test(path) && !path.split('/').some((part) => part === '.' || part === '..')) {
      req.url = '/api/' + path;
    }
  }
  app(req, res);
}
