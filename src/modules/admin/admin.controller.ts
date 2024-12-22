
// src/modules/admin/admin.controller.ts
import { 
    Controller, 
    Get, 
    Patch, 
    Post, 
    Delete,
    Body, 
    Param,
    UseGuards 
  } from '@nestjs/common';
  import { AdminService } from './admin.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { AdminGuard } from './guards/admin.guard';
  import { UpdateSettingsDto } from './dto/update-settings.dto';
  
  @Controller('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  export class AdminController {
    constructor(private readonly adminService: AdminService) {}
  
    @Get('settings')
    getSettings() {
      return this.adminService.getSettings();
    }
  
    @Patch('settings')
    updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
      return this.adminService.updateSettings(updateSettingsDto);
    }
  
    @Get('users/pending')
    getPendingUsers() {
      return this.adminService.getPendingUsers();
    }
  
    @Post('users/approve/:userId')
    approveUser(@Param('userId') userId: string) {
      return this.adminService.approveUser(userId);
    }
  
    @Post('users/reject/:userId')
    rejectUser(@Param('userId') userId: string) {
      return this.adminService.rejectUser(userId);
    }
  }