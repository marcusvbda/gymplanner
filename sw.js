/* Cache simples para funcionar sem sinal na academia.
   Suba o VERSAO sempre que mudar index.html ou plano.json. */
const VERSAO = 'treino-v1';
const ARQUIVOS = ['./', './index.html', './plano.json', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const rede = fetch(e.request).then(res => {
        if (res.ok) caches.open(VERSAO).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || rede;
    })
  );
});
