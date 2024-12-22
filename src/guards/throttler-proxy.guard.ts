// src/guards/throttler-proxy.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getUserIP(req: Record<string, any>): string {
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}