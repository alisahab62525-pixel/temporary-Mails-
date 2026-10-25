import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Proxy handler for mail APIs
  const createMailProxy = (targetHost: string, prefix: string) => async (req: Request, res: Response) => {
    const cleanPath = req.originalUrl.replace(prefix, '') || '/';
    const targetUrl = targetHost + cleanPath;
    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'origin': targetHost.replace('api.', '')
      };
      if (req.headers.authorization) {
        headers['authorization'] = req.headers.authorization as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const apiRes = await fetch(targetUrl, fetchOptions);
      const data = await apiRes.text();

      const contentType = apiRes.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);

      res.status(apiRes.status).send(data);
    } catch (err: any) {
      console.error(`[Proxy Error] ${targetUrl}:`, err.message);
      res.status(502).json({ error: 'Proxy request failed', details: err.message });
    }
  };

  app.all('/api/mail-primary*', createMailProxy('https://api.mail.tm', '/api/mail-primary'));
  app.all('/api/mail-fallback*', createMailProxy('https://api.mail.gw', '/api/mail-fallback'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[DakBox Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DakBox Server Fatal]', err);
  process.exit(1);
});
