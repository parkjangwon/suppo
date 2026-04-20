/// <reference lib="webworker" />
export {};

// PWA Service Worker - Offline support and caching
const CACHE_NAME = "suppo-helpdesk-v1";
const STATIC_ASSETS = [
  "/",
  "/ticket/new",
  "/knowledge",
  "/offline.html"
];

// Install event - cache static assets
declare const self: ServiceWorkerGlobalScope;
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event: FetchEvent) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;
  
  // Skip API calls
  if (event.request.url.includes("/api/")) return;
  
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      
      return fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches
              .match("/offline.html")
              .then((offlinePage) => offlinePage ?? new Response("Offline", { status: 503 }));
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});

// Push event - handle push notifications
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
      data.title || "Suppo Helpdesk",
      {
        body: data.body || "New notification",
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: data.url || "/",
      }
    )
  );
});

// Notification click event
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  
  if (event.action === "open" || !event.action) {
    event.waitUntil(
      (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(
        event.notification.data || "/"
      )
    );
  }
});

// Background sync - queue offline actions
self.addEventListener("sync", ((event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === "sync-tickets") {
    syncEvent.waitUntil(syncPendingTickets());
  }
}) as EventListener);

async function syncPendingTickets(): Promise<void> {
  // Get pending tickets from IndexedDB and sync
  const pending = await getPendingTickets();
  for (const ticket of pending) {
    try {
      await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticket)
      });
      await removePendingTicket(ticket.id);
    } catch {
      // Will retry on next sync
    }
  }
}

async function getPendingTickets(): Promise<Array<{ id: string } & Record<string, unknown>>> {
  // Would read from IndexedDB
  return [];
}

async function removePendingTicket(id: string): Promise<void> {
  // Would remove from IndexedDB
  void id;
}
