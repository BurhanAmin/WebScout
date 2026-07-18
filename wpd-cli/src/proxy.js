const http = require('http');
const httpProxy = require('http-proxy');
const { logMetric } = require('./db');

function startProxy({ proxyPort, targetPort, commitHash }) {
  // A forwarder aimed at your real app
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${targetPort}`,
  });

  // If the app is unreachable, respond gracefully instead of crashing
  proxy.on('error', (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'WPD proxy: target app not reachable' }));
  });

  // Our own server that wraps the proxy so we can time every request
  const server = http.createServer((req, res) => {
    const start = Date.now();

    // Fires when the response has been fully sent back to the client
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

    // Hand the request off to the real app
    proxy.web(req, res);
  });

  server.listen(proxyPort, () => {
    console.log(`WPD proxy on http://localhost:${proxyPort} -> forwarding to :${targetPort}`);
  });
}


module.exports = { startProxy };