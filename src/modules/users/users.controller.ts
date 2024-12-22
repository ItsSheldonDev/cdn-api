// src/modules/users/users.controller.ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@GetUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @GetUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get('quota')
  getQuota(@GetUser() user: any) {
    return this.usersService.getQuota(user.id);
  }

  @Get('stats')
  getStats(@GetUser() user: any) {
    return this.usersService.getStats(user.id);
  }
}