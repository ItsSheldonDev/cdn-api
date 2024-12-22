// src/modules/admin/admin.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' },
    });

    if (!settings) {
      // Créer les paramètres par défaut s'ils n'existent pas
      return this.prisma.settings.create({
        data: {
          id: '1',
          maxFileSize: 100,
          maxAdminFileSize: 10240,
          allowedFileTypes: ['*'],
          defaultExpiration: 'never',
          approvalRequired: true,
          approvalExpiration: 72,
          maxStoragePerUser: 1024,
          minPasswordLength: 8,
          requireEmailVerification: true,
          maxLoginAttempts: 5
        },
      });
    }

    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    // Validation des données
    if (updateSettingsDto.maxFileSize > updateSettingsDto.maxAdminFileSize) {
      throw new BadRequestException(
        'La taille maximale des fichiers utilisateurs ne peut pas être supérieure à celle des administrateurs'
      );
    }

    if (updateSettingsDto.minPasswordLength < 6) {
      throw new BadRequestException(
        'La longueur minimale du mot de passe doit être d\'au moins 6 caractères'
      );
    }

    return this.prisma.settings.update({
      where: { id: '1' },
      data: updateSettingsDto,
    });
  }

  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: {
        isApproved: false,
        approvalExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        approvalExpires: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvalExpires: null,
      },
    });
  }

  async rejectUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async cleanupExpiredRequests() {
    return this.prisma.user.deleteMany({
      where: {
        isApproved: false,
        approvalExpires: {
          lt: new Date(),
        },
      },
    });
  }
}