// Service worker do Finanças App. Cuida só do "casco" do app (index.html e manifest),
// para abrir rápido e funcionar sem internet. Os dados vêm do GitHub e NÃO passam por aqui.
const CACHE_NAME = 'financas-shell-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // apaga caches antigos (inclusive respostas da API do GitHub guardadas pela versão anterior)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Outros sites (API do GitHub, fontes): direto na rede, sem cache.
  if (url.origin !== self.location.origin) return;
  // Rede primeiro, sempre conferindo com o servidor ('no-cache'), para que uma versão
  // nova do index.html apareça na hora. Sem internet, usa a última cópia guardada.
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  const netReq = isPage ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : req;
  event.respondWith(
    fetch(netReq)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (isPage ? caches.match('./index.html') : undefined)))
  );
});
