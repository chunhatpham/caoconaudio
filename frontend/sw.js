const CACHE_NAME = 'caocon-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Cấu hình cơ bản, luôn lấy dữ liệu mới nhất từ mạng
    event.respondWith(fetch(event.request));
});