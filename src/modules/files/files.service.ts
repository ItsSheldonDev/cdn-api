// src/modules/files/files.service.ts
import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as sharp from 'sharp';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface UploadOptions {
  customName?: string;
  password?: string;
  expiration?: string;
  compress?: boolean;
}

@Injectable()
export class FilesService {
  private readonly uploadPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get('UPLOAD_DIR', 'uploads');
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  private async getSettings() {
    const settings = await this.prisma.settings.findFirst({ 
      where: { id: '1' } 
    });
    if (!settings) {
      throw new InternalServerErrorException('Settings not found');
    }
    return settings;
  }

  private generateUniqueFileName(originalName: string): string {
    const hash = createHash('sha256')
      .update(`${originalName}${Date.now()}${randomBytes(16)}`)
      .digest('hex');
    const ext = path.extname(originalName);
    return `${hash}${ext}`;
  }

  private generateShareCode(): string {
    return randomBytes(4).toString('hex');
  }

  private async hashPassword(password?: string): Promise<string | null> {
    if (!password) return null;
    return bcrypt.hash(password, 10);
  }

  private calculateExpiration(expiration: string | undefined, defaultExpiration: string): Date | null {
    const getExpirationDays = (exp: string) => ({
      '1day': 1,
      '7days': 7,
      '30days': 30,
      'never': 0
    })[exp] || 0;

    const exp = expiration || defaultExpiration;
    const days = getExpirationDays(exp);
    
    if (days === 0 || exp === 'never') return null;

    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async validateUpload(file: Express.Multer.File, userId: string, isAdmin: boolean) {
    const settings = await this.getSettings();
    const maxSize = isAdmin ? settings.maxAdminFileSize : settings.maxFileSize;
    const maxSizeBytes = maxSize * 1024 * 1024;

    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`La taille du fichier dépasse la limite de ${maxSize}MB`);
    }

    if (!settings.allowedFileTypes.includes('*') && 
        !settings.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }

    if (!isAdmin) {
      const { _sum: { size } } = await this.prisma.file.aggregate({
        where: { userId },
        _sum: { size: true }
      });
      
      const currentStorage = size || 0;
      const maxStorage = settings.maxStoragePerUser * 1024 * 1024;
      
      if (currentStorage + file.size > maxStorage) {
        throw new BadRequestException('Quota de stockage dépassé');
      }
    }

    return settings;
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    isAdmin: boolean,
    options: UploadOptions = {}
  ) {
    await this.ensureUploadDir();
    const settings = await this.validateUpload(file, userId, isAdmin);
    
    let fileBuffer = file.buffer;
    let metadata = {};

    // Compression d'image
    if (options.compress && file.mimetype.startsWith('image/')) {
      try {
        const compressed = await sharp(fileBuffer)
          .jpeg({ quality: 80 })
          .toBuffer();
        
        metadata = {
          compression: {
            originalSize: fileBuffer.length,
            compressedSize: compressed.length,
            savedBytes: fileBuffer.length - compressed.length,
            savedPercentage: Math.round(
              ((fileBuffer.length - compressed.length) / fileBuffer.length) * 100
            ),
          },
        };
        
        fileBuffer = compressed;
      } catch (error) {
        console.error('Erreur lors de la compression:', error);
      }
    }

    const fileName = this.generateUniqueFileName(file.originalname);
    const filePath = path.join(this.uploadPath, fileName);
    
    try {
      await fs.writeFile(filePath, fileBuffer);
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de l\'enregistrement du fichier');
    }

    const expiresAt = this.calculateExpiration(options.expiration, settings.defaultExpiration);
    const hashedPassword = await this.hashPassword(options.password);

    const fileDoc = await this.prisma.file.create({
      data: {
        originalName: file.originalname,
        customName: options.customName || file.originalname,
        filePath: fileName,
        size: fileBuffer.length,
        mimeType: file.mimetype,
        userId,
        shareCode: this.generateShareCode(),
        password: hashedPassword,
        expiresAt,
        metadata,
      },
    });

    return {
      id: fileDoc.id,
      shareCode: fileDoc.shareCode,
      metadata
    };
  }

  async getFileInfo(shareCode: string) {
    const file = await this.prisma.file.findUnique({
      where: { shareCode },
      select: {
        id: true,
        originalName: true,
        customName: true,
        size: true,
        mimeType: true,
        password: true,
        expiresAt: true,
        downloadCount: true,
        metadata: true,
      },
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    if (file.expiresAt && new Date() > file.expiresAt) {
      throw new BadRequestException('Ce fichier a expiré');
    }

    return {
      ...file,
      hasPassword: !!file.password,
      password: undefined,
    };
  }

  async verifyPassword(shareCode: string, password: string) {
    const file = await this.prisma.file.findUnique({
      where: { shareCode },
      select: { password: true },
    });

    if (!file || !file.password) {
      throw new BadRequestException('Fichier invalide ou pas de mot de passe requis');
    }

    const isValid = await bcrypt.compare(password, file.password);
    if (!isValid) {
      throw new BadRequestException('Mot de passe incorrect');
    }

    return { valid: true };
  }

  async getFileForPreview(shareCode: string, password?: string) {
    const file = await this.prisma.file.findUnique({
      where: { shareCode }
    });
  
    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }
  
    if (file.expiresAt && new Date() > file.expiresAt) {
      throw new BadRequestException('Ce fichier a expiré');
    }
  
    if (file.password && password) {
      const isValid = await bcrypt.compare(password, file.password);
      if (!isValid) {
        throw new BadRequestException('Mot de passe incorrect');
      }
    } else if (file.password) {
      throw new BadRequestException('Mot de passe requis');
    }
  
    return {
      filePath: path.join(this.uploadPath, file.filePath),
      originalName: file.originalName,
      mimeType: file.mimeType
    };
  }

  async downloadFile(shareCode: string, password?: string) {
    const file = await this.prisma.file.findUnique({
      where: { shareCode },
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    if (file.expiresAt && new Date() > file.expiresAt) {
      throw new BadRequestException('Ce fichier a expiré');
    }

    if (file.password && password) {
      const isValid = await bcrypt.compare(password, file.password);
      if (!isValid) {
        throw new BadRequestException('Mot de passe incorrect');
      }
    } else if (file.password) {
      throw new BadRequestException('Mot de passe requis');
    }

    await this.prisma.file.update({
      where: { id: file.id },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      filePath: path.join(this.uploadPath, file.filePath),
      originalName: file.customName || file.originalName,
      mimeType: file.mimeType,
    };
  }

  async getUserFiles(userId: string) {
    return this.prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuota(userId: string) {
    const [settings, userFiles] = await Promise.all([
      this.getSettings(),
      this.prisma.file.aggregate({
        where: { userId },
        _sum: { size: true }
      })
    ]);
  
    const used = userFiles._sum.size || 0;
    const max = settings.maxStoragePerUser * 1024 * 1024;
  
    return {
      used,
      max,
      available: max - used,
      percentage: Math.round((used / max) * 100)
    };
  }

  async deleteFile(shareCode: string, userId: string, isAdmin: boolean) {
    const file = await this.prisma.file.findUnique({
      where: { shareCode },
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    if (!isAdmin && file.userId !== userId) {
      throw new BadRequestException('Non autorisé à supprimer ce fichier');
    }

    try {
      const filePath = path.join(this.uploadPath, file.filePath);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      // On continue malgré l'erreur pour nettoyer la BD
    }

    await this.prisma.file.delete({
      where: { id: file.id },
    });

    return { success: true };
  }

  async cleanupExpiredFiles() {
    const expiredFiles = await this.prisma.file.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        const filePath = path.join(this.uploadPath, file.filePath);
        await fs.unlink(filePath);
        await this.prisma.file.delete({
          where: { id: file.id },
        });
        deletedCount++;
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier ${file.id}:`, error);
      }
    }

    return { deletedCount };
  }
}