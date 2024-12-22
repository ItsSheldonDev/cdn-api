// src/modules/users/dto/update-profile.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}