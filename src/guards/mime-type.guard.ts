// src/guards/mime-type.guard.ts
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MimeTypeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      return true;
    }

    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' }
    });

    if (settings.allowedFileTypes.includes('*')) {
      return true;
    }

    if (!settings.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Type de fichier non autorisé: ${file.mimetype}`);
    }

    return true;
  }
}