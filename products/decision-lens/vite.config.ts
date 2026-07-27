import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Proxy plugin for custom LLM API endpoints.
 * Browser sends requests to /dl-proxy/<path> with header x-dl-target=<origin>.
 * The plugin forwards the request to <origin>/<path>, stripping the /dl-proxy prefix.
 * This bypasses CORS restrictions during development.
 */
function apiProxyPlugin(): Plugin {
  return {
    name: 'dl-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/dl-proxy')) return next();

        const targetOrigin = req.headers['x-dl-target'] as string;
        if (!targetOrigin) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing x-dl-target header');
          return;
        }

        // Strip /dl-proxy prefix from path
        const targetPath = req.url.replace(/^\/dl-proxy/, '') || '/';
        const targetUrl = `${targetOrigin.replace(/\/+$/, '')}${targetPath}`;

        // Forward headers (excluding hop-by-hop headers)
        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (key === 'x-dl-target') continue;
          if (typeof value === 'string') forwardHeaders[key] = value;
        }
        forwardHeaders['host'] = new URL(targetUrl).host;

        // Collect request body
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks);

          fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
          }).then(async (proxyRes) => {
            const responseHeaders: Record<string, string> = {};
            proxyRes.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });
            // Add CORS headers so the browser accepts the response
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
  base: '/tools/decision-lens/',
  plugins: [react(), tailwindcss(), apiProxyPlugin()],
})
