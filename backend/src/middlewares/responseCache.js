const cacheStore = new Map();
let lastCleanupAt = 0;

function cleanupExpired(now = Date.now()) {
  // Cleanup berkala supaya map tidak tumbuh terus.
  if (now - lastCleanupAt < 60 * 1000) return;
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
  lastCleanupAt = now;
}

function cacheResponse(ttlSeconds = 15) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const now = Date.now();
    cleanupExpired(now);

    const cacheKey = req.originalUrl;
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('X-App-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.status(cached.statusCode).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(cacheKey, {
          statusCode: res.statusCode,
          body,
          expiresAt: Date.now() + (ttlSeconds * 1000),
        });
        res.setHeader('X-App-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      }
      return originalJson(body);
    };

    next();
  };
}

function invalidateCache(prefixes = []) {
  if (!prefixes || prefixes.length === 0) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    const shouldDelete = prefixes.some((prefix) => key.startsWith(prefix));
    if (shouldDelete) cacheStore.delete(key);
  }
}

module.exports = { cacheResponse, invalidateCache };
