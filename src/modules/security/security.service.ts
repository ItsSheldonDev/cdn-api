// src/modules/security/security.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityService {
  constructor(private configService: ConfigService) {}

  getCorsConfig() {
    return {
      origin: ['http://localhost:3000'],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }

  getHelmetConfig() {
    return {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false
    };
  }

  getUploadLimits(isAdmin: boolean = false) {
    return {
      maxFileSize: isAdmin 
        ? this.configService.get<number>('MAX_ADMIN_FILE_SIZE', 10240) * 1024 * 1024
        : this.configService.get<number>('MAX_FILE_SIZE', 100) * 1024 * 1024
    };
  }

  getAllowedMimeTypes() {
    return [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
  }
}