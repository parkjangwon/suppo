/**
 * 슬라이딩 윈도우 기반 Rate Limiting
 * - DoS 공격 방어를 위한 정교한 속도 제한
 * - in-memory 저장소 사용 (운영 환경에서는 Redis 사용 권장)
 */

interface RequestTimestamp {
  timestamp: number;
}

interface RateLimitRecord {
  requests: RequestTimestamp[];
  windowStart: number;
}

// in-memory 저장소 (운영 환경에서는 Redis로 대체 권장)
const store = new Map<string, RateLimitRecord>();

// 메모리 누수 방지를 위한 정기 정리 (5분마다)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  cleanupOldRecords();
}, CLEANUP_INTERVAL);

function cleanupOldRecords() {
  const now = Date.now();
  const maxWindowTime = 60 * 60 * 1000; // 1시간

  for (const [key, record] of store.entries()) {
    if (now - record.windowStart > maxWindowTime) {
      store.delete(key);
    }
  }
}

/**
 * 슬라이딩 윈도우 알고리즘 기반 속도 제한 확인
 * @param ip - 클라이언트 IP 주소
 * @param limit - 최대 요청 수
 * @param windowMs - 시간 창 (밀리초)
 * @returns [isAllowed, remainingRequests, resetTime]
 */
export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store.get(ip);

  if (!record) {
    // 첫 요청
    store.set(ip, {
      requests: [{ timestamp: now }],
      windowStart: now,
    });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  // 윈도우 범위 밖의 요청 제거
  record.requests = record.requests.filter(
    (req) => now - req.timestamp < windowMs
  );

  // 윈도우 시작 시점 업데이트
  if (record.requests.length > 0) {
    record.windowStart = record.requests[0].timestamp;
  } else {
    record.windowStart = now;
  }

  // 요청 수 확인
  if (record.requests.length >= limit) {
    // 가장 오래된 요청의 만료 시간 계산
    const oldestRequest = record.requests[0];
    const resetTime = oldestRequest.timestamp + windowMs;
    return { allowed: false, remaining: 0, resetTime };
  }

  // 새 요청 추가
  record.requests.push({ timestamp: now });
  const remaining = limit - record.requests.length;
  const resetTime = now + windowMs;

  return { allowed: true, remaining, resetTime };
}

/**
 * 특정 IP의 rate limit 초기화
 */
export function clearRateLimit(ip: string) {
  store.delete(ip);
}

/**
 * 특정 IP의 현재 상태 확인
 */
export function getRateLimitStatus(
  ip: string,
  limit: number,
  windowMs: number
): { current: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store.get(ip);

  if (!record) {
    return { current: 0, remaining: limit, resetTime: now + windowMs };
  }

  // 윈도우 범위 밖의 요청 제거
  record.requests = record.requests.filter(
    (req) => now - req.timestamp < windowMs
  );

  const current = record.requests.length;
  const remaining = Math.max(0, limit - current);
  const resetTime = record.requests.length > 0
    ? record.requests[0].timestamp + windowMs
    : now + windowMs;

  return { current, remaining, resetTime };
}

/**
 * Rate Limit 헤더 생성
 */
export function createRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.remaining.toString(),
    "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
  };
}

/**
 * 토큰 버킷 알고리즘 기반 속도 제한 (burst 요청 허용)
 */
interface TokenBucket {
  tokens: number;
  lastUpdate: number;
}

const tokenBuckets = new Map<string, TokenBucket>();

export function checkTokenBucketRateLimit(
  ip: string,
  capacity: number,
  refillRate: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = tokenBuckets.get(ip);

  if (!bucket) {
    tokenBuckets.set(ip, { tokens: capacity - 1, lastUpdate: now });
    return { allowed: true, remaining: capacity - 1 };
  }

  // 시간 경과에 따른 토큰 리필
  const timeSinceLastUpdate = now - bucket.lastUpdate;
  const tokensToAdd = (timeSinceLastUpdate / windowMs) * refillRate;
  bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
  bucket.lastUpdate = now;

  if (bucket.tokens < 1) {
    return { allowed: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(bucket.tokens) };
}
