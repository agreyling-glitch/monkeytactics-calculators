/* Sends Core Web Vitals only when the document declares a same-origin RUM endpoint. */
(() => {
  const endpoint = document.querySelector('meta[name="rum-endpoint"]')?.content;
  if (!endpoint || !endpoint.startsWith('/')) return;
  const send = (metric) => navigator.sendBeacon?.(endpoint, JSON.stringify({ name: metric.name, value: metric.value, id: metric.id, path: location.pathname, navigationType: performance.getEntriesByType('navigation')[0]?.type, at: new Date().toISOString() }));
  const observe = (type, callback) => { try { new PerformanceObserver((list) => callback(list.getEntries())).observe({ type, buffered: true }); } catch {} };
  let cls = 0;
  observe('layout-shift', (entries) => { for (const entry of entries) if (!entry.hadRecentInput) cls += entry.value; });
  observe('largest-contentful-paint', (entries) => { const last = entries.at(-1); if (last) addEventListener('pagehide', () => send({ name: 'LCP', value: last.startTime, id: crypto.randomUUID?.() || String(Date.now()) }), { once: true }); });
  observe('event', (entries) => { const last = entries.at(-1); if (last) send({ name: 'INP', value: last.duration, id: crypto.randomUUID?.() || String(Date.now()) }); });
  addEventListener('pagehide', () => send({ name: 'CLS', value: cls, id: crypto.randomUUID?.() || String(Date.now()) }), { once: true });
})();
