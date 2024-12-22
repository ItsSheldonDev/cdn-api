// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      // Incrémenter le compteur de tentatives
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: { increment: 1 },
          lastLoginAttempt: new Date(),
        },
      });
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isApproved) {
      throw new UnauthorizedException('Compte en attente d\'approbation');
    }

    // Réinitialiser le compteur de tentatives
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAttempt: null,
      },
    });

    return {
      accessToken: this.jwtService.sign({ 
        sub: user.id,
        email: user.email,
        isAdmin: user.isAdmin 
      }),
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Calculer la date d'expiration de l'approbation
    const approvalExpires = new Date();
    approvalExpires.setHours(approvalExpires.getHours() + 72); // 3 jours

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        isApproved: false,
        approvalExpires,
      },
    });

    return {
      message: 'Inscription réussie, en attente d\'approbation par un administrateur',
      userId: user.id,
    };
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isApproved) {
      throw new UnauthorizedException();
    }

    return user;
  }
}