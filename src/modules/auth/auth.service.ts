// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

    // Vérifier les tentatives de connexion
    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' },
    });

    if (user.loginAttempts >= settings.maxLoginAttempts) {
      const lockoutDuration = 30; // 30 minutes de blocage
      const lastAttempt = user.lastLoginAttempt;
      
      if (lastAttempt && new Date().getTime() - lastAttempt.getTime() < lockoutDuration * 60 * 1000) {
        throw new UnauthorizedException('Compte temporairement bloqué. Veuillez réessayer plus tard.');
      } else {
        // Réinitialiser le compteur après la période de blocage
        await this.prisma.user.update({
          where: { id: user.id },
          data: { 
            loginAttempts: 0,
            lastLoginAttempt: null
          }
        });
      }
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
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

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isApproved) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }

  async register(registerDto: RegisterDto) {
    // Vérifier les settings
    const settings = await this.prisma.settings.findFirst({
      where: { id: '1' }
    });

    // Valider la longueur du mot de passe
    if (registerDto.password.length < settings.minPasswordLength) {
      throw new BadRequestException(
        `Le mot de passe doit contenir au moins ${settings.minPasswordLength} caractères`
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Calculer la date d'expiration selon les settings
    const approvalExpires = new Date();
    approvalExpires.setHours(approvalExpires.getHours() + settings.approvalExpiration);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        isApproved: !settings.approvalRequired, // Approuvé automatiquement si non requis
        approvalExpires: settings.approvalRequired ? approvalExpires : null,
      },
    });

    return {
      message: settings.approvalRequired
        ? 'Inscription réussie, en attente d\'approbation par un administrateur'
        : 'Inscription réussie',
      userId: user.id,
    };
  }
}
