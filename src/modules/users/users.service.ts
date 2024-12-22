// src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }

      // Vérifier si la vérification d'email est requise
      const settings = await this.prisma.settings.findFirst({
        where: { id: '1' },
      });

      if (settings.requireEmailVerification) {
        // Ici, vous pourriez implémenter la logique d'envoi d'email de vérification
        // et mettre un flag emailVerified à false
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
      },
    });
  }

  async getStats(userId: string) {
    const [files, totalDownloads] = await Promise.all([
      this.prisma.file.count({
        where: { userId },
      }),
      this.prisma.file.aggregate({
        where: { userId },
        _sum: {
          downloadCount: true,
        },
      }),
    ]);

    const filesGroupedByType = await this.prisma.file.groupBy({
      by: ['mimeType'],
      where: { userId },
      _count: {
        mimeType: true,
      },
    });

    return {
      totalFiles: files,
      totalDownloads: totalDownloads._sum.downloadCount || 0,
      filesByType: filesGroupedByType.reduce((acc, curr) => {
        acc[curr.mimeType] = curr._count.mimeType;
        return acc;
      }, {}),
    };
  }

  async getQuota(userId: string) {
    const [settings, userFiles] = await Promise.all([
      this.prisma.settings.findFirst({
        where: { id: '1' },
      }),
      this.prisma.file.aggregate({
        where: { userId },
        _sum: {
          size: true,
        },
      }),
    ]);

    const usedStorage = userFiles._sum.size || 0;
    const maxStorage = settings.maxStoragePerUser;
    const maxStorageBytes = maxStorage * 1024 * 1024; // Conversion en bytes

    return {
      used: usedStorage,
      max: maxStorageBytes,
      available: maxStorageBytes - usedStorage,
      percentage: Math.round((usedStorage / maxStorageBytes) * 100),
      maxFileSize: settings.maxFileSize * 1024 * 1024, // Taille max d'upload en bytes
    };
  }
}