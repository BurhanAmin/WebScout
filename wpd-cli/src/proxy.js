const http = require('http');
const httpProxy = require('http-proxy');
const { logMetric, logClientEvent } = require('./db');
const { injectRumScript } = require('./injector');

function startProxy({ proxyPort, targetPort, commitHash }) {
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${targetPort}`,
    selfHandleResponse: true, // we handle the response so we can inject the RUM script
  });

  proxy.on('error', (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'WPD proxy: target app not reachable' }));
  });

  // Buffer the app's response; inject RUM into HTML, pass everything else through
  proxy.on('proxyRes', (proxyRes, req, res) => {
    const contentType = proxyRes.headers['content-type'] || '';
    const chunks = [];
    proxyRes.on('data', (c) => chunks.push(c));
    proxyRes.on('end', () => {
      let body = Buffer.concat(chunks);
      const headers = { ...proxyRes.headers };

      if (contentType.includes('text/html')) {
        const html = injectRumScript(body.toString());
        body = Buffer.from(html);
        headers['content-length'] = Buffer.byteLength(body); // body grew, fix the length
      }

      res.writeHead(proxyRes.statusCode, headers);
      res.end(body);
    });
  });

  const server = http.createServer((req, res) => {
    // Intercept RUM data — store it locally, don't forward to the app
    if (req.method === 'POST' && req.url === '/__wpd/collect') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const { events } = JSON.parse(body);
          events.forEach((e) => logClientEvent(e, commitHash));
        } catch (err) {
          // ignore malformed payloads
        }
        res.writeHead(204);
        res.end();
      });
      return;
    }

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logMetric({
        method: req.method,
        path: req.url,
        status: res.statusCode,
        duration_ms: duration,
        commit_hash: commitHash,
        timestamp: new Date().toISOString(),
      });
      console.log(`${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    });

    proxy.web(req, res);
  });

  server.listen(proxyPort, () => {
    console.log(`WPD proxy on http://localhost:${proxyPort} -> forwarding to :${targetPort}`);
  });
}

module.exports = { startProxy };