// Service worker: يخزّن ملفات التطبيق ليعمل بدون إنترنت
// عند تحديث الملفات غيّر رقم النسخة V ليصل التحديث للمستخدمين
const V = "medrep-v2";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const SHELL = ["./", "index.html", "config.js", "manifest.json", "icon-192.png", "icon-512.png", SUPABASE_JS];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.endsWith("supabase.co")) return; // بيانات الخادم لا تُخزَّن هنا

  if (u.origin === location.origin) {
    // من الذاكرة فورا (سريع على الشبكات الضعيفة) مع تحديث في الخلفية
    e.respondWith(
      caches.open(V).then(async (c) => {
        const hit = await c.match(r, { ignoreSearch: true });
        const net = fetch(r)
          .then((res) => { if (res.ok) c.put(r, res.clone()); return res; })
          .catch(() => null);
        return hit || net.then((res) => res || c.match("index.html"));
      })
    );
    return;
  }

  e.respondWith(
    caches.match(r).then((hit) => hit || fetch(r).then((res) => {
      const cp = res.clone();
      caches.open(V).then((c) => c.put(r, cp));
      return res;
    }))
  );
});
