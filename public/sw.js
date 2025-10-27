// File: public\sw.js
// Project: improve-my-city-frontend
// Auto-added for reference

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : { title: 'Notification', body: '' };
  event.waitUntil(self.registration.showNotification(data.title || 'Improve My City', { body: data.body || '', icon: '/icon-192.png' }));
});