import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * Proxy plugin for Decision Lens API calls.
 * Forwards /dl-proxy/* requests to the target API, bypassing CORS.
 */
function dlProxyPlugin() {
  return {
    name: 'dl-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/dl-proxy')) return next();

        const targetOrigin = req.headers['x-dl-target'];
        if (!targetOrigin) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing x-dl-target header');
          return;
        }

        const targetPath = req.url.replace(/^\/dl-proxy/, '') || '/';
        const targetUrl = `${targetOrigin.replace(/\/+$/, '')}${targetPath}`;

        const forwardHeaders = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (key === 'x-dl-target') continue;
          if (typeof value === 'string') forwardHeaders[key] = value;
        }
        forwardHeaders['host'] = new URL(targetUrl).host;

        // Replace Authorization header with server-side API key
        const serverApiKey = process.env.DEEPSEEK_API_KEY;
        if (serverApiKey) {
          forwardHeaders['authorization'] = `Bearer ${serverApiKey}`;
        }

        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
          }).then(async (proxyRes) => {
            const responseHeaders = {};
            proxyRes.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });
            responseHeaders['access-control-allow-origin'] = '*';
            res.writeHead(proxyRes.status, responseHeaders);
            const responseBody = await proxyRes.arrayBuffer();
            res.end(Buffer.from(responseBody));
          }).catch((err) => {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end(`Proxy error: ${err.message}`);
          });
        });
      });
    },
  };
}

export default defineConfig({
  integrations: [react()],
  site: 'https://senmoo.ai',
  output: 'static',
  vite: {
    plugins: [dlProxyPlugin()],
  },
});
