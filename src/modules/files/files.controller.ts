// src/modules/files/files.controller.ts
import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { SecurityService } from '../security/security.service';
  import { FilesService } from './files.service';
  import { diskStorage } from 'multer';
  import { GetUser } from '../auth/decorators/get-user.decorator';
  import { Express } from 'express';
  
  @Controller('files')
  export class FilesController {
    constructor(
      private readonly filesService: FilesService,
      private readonly securityService: SecurityService
    ) {}
  
    private getMulterConfig() {
      return {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
          }
        }),
        fileFilter: (req: any, file: Express.Multer.File, cb: Function) => {
          const allowedTypes = this.securityService.getAllowedMimeTypes();
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new BadRequestException(`Type de fichier non autorisé: ${file.mimetype}`), false);
          }
        },
        limits: {
          fileSize: 100 * 1024 * 1024 // 100MB par défaut
        }
      };
    }
  
    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
      @UploadedFile() file: Express.Multer.File,
      @GetUser() user: any
    ) {
      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }
  
      const allowedTypes = this.securityService.getAllowedMimeTypes();
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Type de fichier non autorisé: ${file.mimetype}`);
      }
  
      const limits = this.securityService.getUploadLimits(user.isAdmin);
      if (file.size > limits.maxFileSize) {
        throw new BadRequestException(`Taille de fichier dépassée (max: ${limits.maxFileSize / 1024 / 1024}MB)`);
      }
  
      return this.filesService.uploadFile(file, user.id, user.isAdmin);
    }
  }