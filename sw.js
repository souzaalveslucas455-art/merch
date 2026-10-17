/* Merchandising: abre os apps do repositor e do lider mesmo sem internet.
   - As PAGINAS (app.html, lideranca.html...): com internet, sempre a versao nova do
     GitHub (rede primeiro); sem internet ou com sinal fraco (4 s), a ultima copia guardada.
   - Os DADOS (Supabase) nunca passam por aqui: vao direto, como sempre.
   - Icones, arquivos de identidade e a biblioteca do mapa: guardados depois do 1o uso.
   Para forcar todos os celulares a renovarem a copia, mude a VERSAO abaixo. */
const VERSAO = "merch-2026-10-17a";
const CASCA = ["./app.html", "./lideranca.html",
  "./manifest-repositor.webmanifest", "./manifest-lideranca.webmanifest",
  "./repositor-192.png", "./repositor-512.png", "./repositor-maskable-512.png",
  "./lider-192.png", "./lider-512.png", "./lider-maskable-512.png"];
const BIBLIOTECAS = ["https://cdnjs.cloudflare.com/"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VERSAO).then(c =>
    Promise.all(CASCA.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error("prazo")), ms);
    promessa.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); falha(e); });
  });
}

async function paginaRedePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  try {
    const r = await comPrazo(fetch(req), 4000);
    if (r && r.ok) cache.put(req, r.clone());
    return r;
  } catch (e) {
    const guardada = await cache.match(req, {ignoreSearch: true});
    if (guardada) return guardada;
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
      "<body style='font-family:sans-serif;padding:24px'><h2>Sem internet</h2>" +
      "<p>Abra o app uma vez com internet para ele ficar guardado no celular.</p></body>",
      {status: 503, headers: {"Content-Type": "text/html; charset=utf-8"}});
  }
}

async function guardadoPrimeiro(req) {
  const cache = await caches.open(VERSAO);
  const guardado = await cache.match(req);
  const rede = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) cache.put(req, r.clone()); return r; }).catch(() => null);
  return guardado || (await rede) || Response.error();
}

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || url.pathname.endsWith(".html")) return ev.respondWith(paginaRedePrimeiro(req));
    if (/\.(png|webmanifest|json|js)$/.test(url.pathname) && !url.pathname.endsWith("/sw.js")) return ev.respondWith(guardadoPrimeiro(req));
    return;
  }
  if (BIBLIOTECAS.some(b => req.url.startsWith(b))) return ev.respondWith(guardadoPrimeiro(req));
  // o resto (Supabase, mapas, WhatsApp...) vai direto para a internet
});
