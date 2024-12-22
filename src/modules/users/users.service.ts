// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
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
    const maxStorage = settings?.maxStoragePerUser || 1024; // 1GB par défaut

    return {
      used: usedStorage,
      max: maxStorage * 1024 * 1024, // Conversion en bytes
      percentage: Math.round((usedStorage / (maxStorage * 1024 * 1024)) * 100),
    };
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
}
