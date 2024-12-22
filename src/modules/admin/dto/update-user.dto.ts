// src/modules/admin/dto/update-user.dto.ts
import { IsBoolean, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsNumber()
  maxStorage?: number;
}