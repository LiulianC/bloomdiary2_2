// Service Worker 版本
const CACHE_VERSION = 'bloom-diary-v2';

// 需要缓存的静态资源列表
const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './css/styles.css',
    './css/dark-mode.css',
    './css/fontawesome.min.css',
    './fonts/fa-solid-900.woff2',
    './fonts/fa-regular-400.woff2',
    './js/app.js',
    './js/storage.js',
    './js/timer.js',
    './js/tasks.js',
    './js/statistics.js',
    './js/notifications.js',
    './js/settings.js',
    './js/redbook.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'
];

// 检查是否支持缓存API
function isCacheSupported() {
    return 'caches' in self && 
           (location.protocol === 'https:' || 
            location.hostname === 'localhost' || 
            location.hostname === '127.0.0.1');
}

// 安装Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker 安装中...');
    
    if (!isCacheSupported()) {
        console.log('当前环境不支持缓存API，跳过缓存');
        self.skipWaiting();
        return;
    }
    
    // 预缓存静态资源
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => {
                console.log('缓存静态资源中...');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch(error => {
                console.warn('缓存预加载失败:', error);
                return self.skipWaiting();
            })
    );
});

// 激活Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker 已激活');
    
    if (!isCacheSupported()) {
        console.log('当前环境不支持缓存API');
        return self.clients.claim();
    }
    
    // 清理旧的缓存
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_VERSION) {
                            console.log('删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
            .catch(error => {
                console.warn('清理缓存失败:', error);
                return self.clients.claim();
            })
    );
});

// 处理网络请求
self.addEventListener('fetch', event => {
    // 跳过chrome-extension请求和不支持的协议
    if (!event.request.url.startsWith('http') || 
        event.request.url.includes('chrome-extension:') ||
        !isCacheSupported()) {
        return;
    }
    
    // 网络优先策略
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 请求成功，将响应复制一份并存入缓存
                if (response.status === 200 && response.type === 'basic') {
                    const clonedResponse = response.clone();
                    
                    caches.open(CACHE_VERSION)
                        .then(cache => {
                            cache.put(event.request, clonedResponse);
                        })
                        .catch(error => {
                            console.warn('缓存写入失败:', error);
                        });
                }
                
                return response;
            })
            .catch(() => {
                // 网络请求失败，尝试从缓存中获取
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            console.log('从缓存获取:', event.request.url);
                            return cachedResponse;
                        }
                        // 如果缓存中也没有，返回离线页面或错误
                        throw new Error('资源不可用');
                    });
            })
    );
});

// 处理推送通知
self.addEventListener('push', event => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: './img/icons/icon-192x192.png',
                badge: './img/icons/icon-72x72.png',
                data: data.url ? { url: data.url } : null
            })
        );
    } catch (error) {
        console.warn('推送通知处理失败:', error);
    }
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
        return;
    }
    
    // 默认行为：聚焦已打开的窗口或打开新窗口
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('./');
            })
            .catch(error => {
                console.warn('通知点击处理失败:', error);
            })
    );
});