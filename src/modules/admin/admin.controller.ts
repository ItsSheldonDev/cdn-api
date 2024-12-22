// src/modules/admin/admin.controller.ts
import { 
    Controller, 
    Get, 
    Patch, 
    Post,
    Param,
    Body, 
    UseGuards,
  } from '@nestjs/common';
  import { AdminService } from './admin.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { AdminGuard } from './guards/admin.guard';
  import { UpdateSettingsDto } from './dto/update-settings.dto';
  import { UpdateUserDto } from './dto/update-user.dto';
  
  @Controller('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  export class AdminController {
    constructor(private readonly adminService: AdminService) {}
  
    // Récupère les paramètres
    @Get('settings')
    getSettings() {
      return this.adminService.getSettings();
    }
  
    // Modifie les paramètres
    @Patch('settings')
    updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
      return this.adminService.updateSettings(updateSettingsDto);
    }
  
    // Statistiques globales
    @Get('stats')
    getStats() {
      return this.adminService.getStats();
    }
  
    // Liste des utilisateurs
    @Get('users')
    getUsers() {
      return this.adminService.getUsers();
    }
  
    // Modifie un utilisateur
    @Patch('users/:userId')
    updateUser(
      @Param('userId') userId: string,
      @Body() updateUserDto: UpdateUserDto,
    ) {
      return this.adminService.updateUser(userId, updateUserDto);
    }
  
    // Approuve un utilisateur
    @Post('users/approve/:userId')
    approveUser(@Param('userId') userId: string) {
      return this.adminService.approveUser(userId);
    }
  
    // Rejette un utilisateur
    @Post('users/reject/:userId')
    rejectUser(@Param('userId') userId: string) {
      return this.adminService.rejectUser(userId);
    }
  
    // Liste des fichiers (admin)
    @Get('files')
    getFiles() {
      return this.adminService.getAllFiles();
    }
  
    // Supprime un fichier (admin)
    @Post('files/:fileId/delete')
    deleteFile(@Param('fileId') fileId: string) {
      return this.adminService.deleteFile(fileId);
    }
  
    // Nettoyage manuel
    @Post('cleanup')
    cleanup() {
      return this.adminService.cleanup();
    }
  
    // Statistiques de stockage
    @Get('stats/storage')
    getStorageStats() {
      return this.adminService.getStorageStats();
    }
  
    // Statistiques de téléchargement
    @Get('stats/downloads')
    getDownloadStats() {
      return this.adminService.getDownloadStats();
    }
  }