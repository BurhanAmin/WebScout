(function () {
  const COLLECT_URL = '/__wpd/collect';
  const buffer = [];
  const originalFetch = window.fetch;

  function send(event) {
    buffer.push(event);
    flush();
  }

  function flush() {
    if (buffer.length === 0) return;
    const payload = JSON.stringify({ events: buffer.splice(0) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, payload);
    } else {
      originalFetch(COLLECT_URL, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 1) Page-load timing, captured after the page finishes loading
  window.addEventListener('load', function () {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcpEntry = performance.getEntriesByType('paint')
      .find(p => p.name === 'first-contentful-paint');

    send({
      type: 'pageload',
      path: location.pathname,
      fcp: fcpEntry ? fcpEntry.startTime : null,
      loadTime: nav ? nav.loadEventEnd : null,
      timestamp: new Date().toISOString(),
    });
  });

  // 2) Patch fetch to catch failed API calls from the browser
  window.fetch = function (...args) {
    const start = performance.now();
    const url = String(args[0]);
    return originalFetch.apply(this, args)
      .then(function (response) {
        if (!response.ok) {
          send({
            type: 'fetch_error',
            url: url,
            status: response.status,
            duration_ms: performance.now() - start,
            timestamp: new Date().toISOString(),
          });
        }
        return response;
      })
      .catch(function (err) {
        send({
          type: 'fetch_error',
          url: url,
          status: 0, // network failure — no HTTP status
          duration_ms: performance.now() - start,
          timestamp: new Date().toISOString(),
        });
        throw err; // re-throw so the app still sees the error
      });
  };
})();