import type { Request } from 'express';

const MAX_USER_AGENT_LENGTH = 2048;

/**
 * Reverse proxy arkasında doğru istemci IP'si için X-Forwarded-For / X-Real-IP kullanır.
 * `main.ts` içinde `trust proxy` ayarlı olduğunda `req.ip` de güvenilir olabilir.
 */
export function getClientIpFromRequest(request: Request): string | undefined {
  const forwarded = (request.headers['x-forwarded-for'] as string)
    ?.split(',')[0]
    ?.trim();
  if (forwarded) {
    return forwarded;
  }
  if (request.ip) {
    return request.ip;
  }
  const realIp = (request.headers['x-real-ip'] as string)?.trim();
  if (realIp) {
    return realIp;
  }
  return request.socket?.remoteAddress || undefined;
}

export function getUserAgentFromRequest(request: Request): string | undefined {
  const raw = request.headers['user-agent'];
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length <= MAX_USER_AGENT_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_USER_AGENT_LENGTH);
}
