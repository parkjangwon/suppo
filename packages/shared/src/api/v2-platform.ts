// API v2 - Developer Platform
import { NextRequest, NextResponse } from "next/server";

export interface APIv2Config {
  version: "2.0";
  baseUrl: string;
  authentication: "bearer" | "oauth2";
}

export interface AppCredential {
  appId: string;
  appName: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  webhookUrl?: string;
}

// OAuth 2.0 implementation
export class OAuth2Server {
  private apps: Map<string, AppCredential> = new Map();
  private tokens: Map<string, { appId: string; scopes: string[]; expiresAt: Date }> = new Map();
  
  registerApp(app: Omit<AppCredential, "clientSecret">): AppCredential {
    const clientSecret = this.generateSecret();
    const fullApp: AppCredential = { ...app, clientSecret };
    this.apps.set(app.appId, fullApp);
    return fullApp;
  }
  
  authenticateClient(clientId: string, clientSecret: string): boolean {
    const app = Array.from(this.apps.values()).find(a => a.clientId === clientId);
    return app?.clientSecret === clientSecret;
  }
  
  createAccessToken(appId: string, scopes: string[]): string {
    const token = this.generateToken();
    this.tokens.set(token, {
      appId,
      scopes,
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour
    });
    return token;
  }
  
  verifyToken(token: string): { valid: boolean; appId?: string; scopes?: string[] } {
    const data = this.tokens.get(token);
    if (!data) return { valid: false };
    if (data.expiresAt < new Date()) {
      this.tokens.delete(token);
      return { valid: false };
    }
    return { valid: true, appId: data.appId, scopes: data.scopes };
  }
  
  private generateSecret(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  
  private generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

// Rate limiting
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;
  
  constructor(limit: number = 100, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
  
  checkLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    const allowed = validTimestamps.length < this.limit;
    const remaining = Math.max(0, this.limit - validTimestamps.length - (allowed ? 1 : 0));
    const resetAt = validTimestamps.length > 0 
      ? Math.min(...validTimestamps) + this.windowMs 
      : now + this.windowMs;
    
    if (allowed) {
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
    }
    
    return { allowed, remaining, resetAt };
  }
}

// API v2 middleware
export function createAPIv2Middleware(oauth: OAuth2Server, rateLimiter: RateLimiter) {
  return async function apiMiddleware(request: NextRequest): Promise<NextResponse | null> {
    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimit = rateLimiter.checkLimit(clientIp);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString()
          }
        }
      );
    }
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const token = authHeader.slice(7);
    const auth = oauth.verifyToken(token);
    
    if (!auth.valid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    
    // Add auth info to request
    (request as unknown as Record<string, unknown>).apiAuth = auth;
    
    return null; // Continue to handler
  };
}

export const oauth2Server = new OAuth2Server();
export const apiRateLimiter = new RateLimiter();
