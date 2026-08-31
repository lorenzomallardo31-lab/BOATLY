/* Boatly intentionally does not cache authenticated pages or customer data. */
const VERSION = "boatly-ops-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-only by design. Offline data will be introduced only with an
  // encrypted, conflict-aware strategy suitable for operational records.
  void VERSION;
});
