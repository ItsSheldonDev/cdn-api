// src/modules/admin/dto/update-settings.dto.ts
import { IsNumber, IsArray, IsString, IsBoolean, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxFileSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxAdminFileSize?: number;

  @IsOptional()
  @IsArray()
  allowedFileTypes?: string[];

  @IsOptional()
  @IsString()
  defaultExpiration?: string;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  approvalExpiration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxStoragePerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(6)
  @Type(() => Number)
  minPasswordLength?: number;

  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxLoginAttempts?: number;
}