// src/modules/files/files.controller.ts
import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Query,
    StreamableFile,
    Response,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { GetUser } from '../auth/decorators/get-user.decorator';
  import { FilesService } from './files.service';
  import { Response as ExpressResponse } from 'express';
  import * as fs from 'fs';
  import * as path from 'path';
  // Correction de l'import pour le type File
  import { Express } from 'express';
  
  @Controller('files')
  export class FilesController {
    constructor(private readonly filesService: FilesService) {}
  
    // Liste tous les fichiers de l'utilisateur
    @Get()
    @UseGuards(JwtAuthGuard)
    async getUserFiles(@GetUser() user: any) {
      return this.filesService.getUserFiles(user.id);
    }
  
    // Upload d'un fichier
    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
      @UploadedFile() file: Express.Multer.File,
      @GetUser() user: any,
      @Body() options: {
        customName?: string;
        password?: string;
        expiration?: string;
        compress?: boolean;
      },
    ) {
      return this.filesService.uploadFile(file, user.id, user.isAdmin, options);
    }
  
    // Obtient le quota de l'utilisateur
    @Get('quota')
    @UseGuards(JwtAuthGuard)
    async getQuota(@GetUser() user: any) {
      return this.filesService.getQuota(user.id);
    }
  
    // Récupère les infos d'un fichier
    @Get(':shareCode/info')
    async getFileInfo(@Param('shareCode') shareCode: string) {
      return this.filesService.getFileInfo(shareCode);
    }
  
    // Prévisualisation d'un fichier
    @Get(':shareCode/preview')
    async previewFile(
      @Param('shareCode') shareCode: string,
      @Query('password') password: string,
      @Response({ passthrough: true }) res: ExpressResponse,
    ) {
      const file = await this.filesService.getFileForPreview(shareCode, password);
      const stream = fs.createReadStream(file.filePath);
      
      res.set({
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
        'Cache-Control': 'public, max-age=31536000',
      });
      
      return new StreamableFile(stream);
    }
  
    // Vérifie le mot de passe d'un fichier partagé
    @Post(':shareCode/verify')
    async verifyPassword(
      @Param('shareCode') shareCode: string,
      @Body('password') password: string,
    ) {
      return this.filesService.verifyPassword(shareCode, password);
    }
  
    // Téléchargement d'un fichier
    @Get(':shareCode')
    async downloadFile(
      @Param('shareCode') shareCode: string,
      @Query('password') password: string,
      @Response({ passthrough: true }) res: ExpressResponse,
    ) {
      const file = await this.filesService.downloadFile(shareCode, password);
      const stream = fs.createReadStream(file.filePath);
      
      res.set({
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      });
      
      return new StreamableFile(stream);
    }
  
    // Supprime un fichier
    @Delete(':shareCode')
    @UseGuards(JwtAuthGuard)
    async deleteFile(
      @Param('shareCode') shareCode: string,
      @GetUser() user: any,
    ) {
      return this.filesService.deleteFile(shareCode, user.id, user.isAdmin);
    }
  }