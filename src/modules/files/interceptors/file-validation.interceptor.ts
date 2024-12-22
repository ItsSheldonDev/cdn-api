// src/modules/files/interceptors/file-validation.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' }
    });

    if (!settings.allowedFileTypes.includes('*') && 
        !settings.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Type de fichier non autorisé: ${file.mimetype}`);
    }

    const maxSize = request.user.isAdmin ? 
      settings.maxAdminFileSize : 
      settings.maxFileSize;

    if (file.size > maxSize * 1024 * 1024) {
      throw new BadRequestException(`Taille maximum dépassée (${maxSize}MB)`);
    }

    return next.handle();
  }
}