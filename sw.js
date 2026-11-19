/* eslint-disable no-undef */
/**
 * The service worker for the employee portal.
 *
 * It exists for one reason: so an employee who opens the app on a lift, a bus or a site with no
 * signal gets the application and a sentence explaining the situation, instead of the browser's
 * dinosaur. It is deliberately the smallest thing that achieves that.
 *
 * <b>It never caches a single byte of HR data.</b> Every request to /api is passed straight to the
 * network and its response is never stored - not payslips, not salaries, not leave balances, not
 * the employee's own profile. A cache on a shared or lost phone is a copy of somebody's pay that
 * nobody authorised and that no logout can reliably erase, which is exactly what the PDPL is about.
 * What is cached is the shell: the HTML, the JavaScript, the CSS and the fonts, all of which are
 * public assets that say nothing about anybody.
 *
 * <b>A deploy must always win.</b> Navigations are network-first, so the moment the phone has
 * signal it gets the index.html the server is serving now, with its current bundle hashes; the
 * cached copy is the fallback, not the source of truth. Hashed assets under /assets are
 * cache-first, because their names change whenever their contents do, so a stale one cannot exist.
 * This is the opposite of the usual cache-first-everything recipe, and it is the reason this
 * worker cannot strand people on last month's build - the failure that makes teams rip service
 * workers back out again.
 */

// Bumping this discards every previously cached asset on activation. It is the one knob: if a
// release ever needs to invalidate the shell wholesale, change this string.
const CACHE = 'hrm-shell-v1';

// The shell is populated as it is used rather than pre-listed, because the bundle filenames carry
// content hashes that change every build and a hard-coded list goes stale the day it is written.
const SHELL_FALLBACK = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(SHELL_FALLBACK))
      // A failure here must not block installation: with no network on first load there is simply
      // nothing to fall back to yet, which is no worse than having no worker at all.
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Anything that could carry employee data, or change it. Never cached, never intercepted. */
function isData(url, request) {
  return url.pathname.startsWith('/api') || request.method !== 'GET';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Other origins are somebody else's business; let the browser do what it would have done.
  if (url.origin !== self.location.origin) return;
  if (isData(url, request)) return;

  // A navigation: the page the person asked for. Network first so a deploy lands immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL_FALLBACK, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(SHELL_FALLBACK).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // A hashed build asset: its name changes when its contents do, so a cached copy is always right.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only store what came back whole and from us. An opaque or partial response cached here
        // would be served forever as if it were the real file.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    }),
  );
});

/**
 * Lets the application empty the shell cache - called on sign-out.
 *
 * No employee data is in there, so this is housekeeping rather than a security control, and it is
 * described that way on purpose: a control that only appears to protect something is worse than
 * none, because it stops people looking for the real one.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'clear-shell-cache') {
    event.waitUntil(caches.delete(CACHE));
  }

  /**
   * Take over now, replacing the worker currently running the page.
   *
   * Sent by the application when the person presses "Update now" - never on our own initiative.
   * A worker that calls skipWaiting() the moment it installs replaces the build underneath
   * somebody mid-sentence, which on this product means a half-written leave reason or an expense
   * claim with a receipt already attached. So the new version waits, visibly, until it is asked
   * for; `installed` is exactly the state the application watches to know it is there.
   */
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});
