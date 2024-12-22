// src/modules/security/security.module.ts
import { Module, Global } from '@nestjs/common';
import { SecurityService } from './security.service';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 5
    }])
  ],
  providers: [
    SecurityService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
  exports: [SecurityService]
})
export class SecurityModule {}
