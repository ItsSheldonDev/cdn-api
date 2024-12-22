// src/modules/admin/admin.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getSettings() {
    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' },
    });

    if (!settings) {
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
          maxLoginAttempts: 5,
        },
      });
    }

    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    return this.prisma.settings.update({
      where: { id: '1' },
      data: updateSettingsDto,
    });
  }

  async getStats() {
    const [
      totalUsers,
      totalFiles,
      storageUsed,
      totalDownloads,
      pendingUsers
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.file.count(),
      this.prisma.file.aggregate({
        _sum: { size: true }
      }),
      this.prisma.file.aggregate({
        _sum: { downloadCount: true }
      }),
      this.prisma.user.count({
        where: {
          isApproved: false,
          approvalExpires: { gt: new Date() }
        }
      })
    ]);

    return {
      users: {
        total: totalUsers,
        pending: pendingUsers
      },
      files: {
        total: totalFiles,
        totalSize: storageUsed._sum.size || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0
      }
    };
  }

  async getStorageStats() {
    const storageByUser = await this.prisma.file.groupBy({
      by: ['userId'],
      _sum: {
        size: true
      }
    });

    const totalStorage = await this.prisma.file.aggregate({
      _sum: {
        size: true
      }
    });

    return {
      totalStorage: totalStorage._sum.size || 0,
      storageByUser
    };
  }

  async getDownloadStats() {
    const downloads = await this.prisma.file.groupBy({
      by: ['createdAt'],
      _sum: {
        downloadCount: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30
    });

    return {
      totalDownloads: downloads.reduce((acc, curr) => acc + (curr._sum.downloadCount || 0), 0),
      downloadsByDay: downloads
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
        _count: {
          select: { files: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async approveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
  
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  
    if (user.isApproved) {
      throw new BadRequestException('Utilisateur déjà approuvé');
    }
  
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvalExpires: null
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true
      }
    });
  }
  
  async rejectUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
  
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
  
    // Supprimer tous les fichiers de l'utilisateur
    const userFiles = await this.prisma.file.findMany({
      where: { userId }
    });
  
    // Supprimer les fichiers physiques
    for (const file of userFiles) {
      try {
        await fs.unlink(path.join(process.cwd(), 'uploads', file.filePath));  // fs.unlink au lieu de fs.promises.unlink
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier ${file.id}:`, error);
      }
    }
  
    // Supprimer l'utilisateur et ses fichiers (cascade)
    await this.prisma.user.delete({
      where: { id: userId }
    });
  
    return {
      message: 'Utilisateur et ses fichiers supprimés avec succès'
    };
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isApproved: true
      }
    });
  }

  async getAllFiles() {
    return this.prisma.file.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async deleteFile(fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    // Supprimer le fichier physique
    try {
      await fs.unlink(path.join(process.cwd(), 'uploads', file.filePath));
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
    }

    // Supprimer l'entrée de la base de données
    await this.prisma.file.delete({
      where: { id: fileId }
    });

    return { message: 'Fichier supprimé avec succès' };
  }

  async cleanup() {
    // Supprimer les fichiers expirés
    const expiredFiles = await this.prisma.file.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    for (const file of expiredFiles) {
      try {
        await fs.unlink(path.join(process.cwd(), 'uploads', file.filePath));
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier ${file.id}:`, error);
      }
    }

    const [deletedFiles, deletedUsers] = await Promise.all([
      this.prisma.file.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      }),
      this.prisma.user.deleteMany({
        where: {
          isApproved: false,
          approvalExpires: {
            lt: new Date()
          }
        }
      })
    ]);

    return {
      filesDeleted: deletedFiles.count,
      usersDeleted: deletedUsers.count
    };
  }
}