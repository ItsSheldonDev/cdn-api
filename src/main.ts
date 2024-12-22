// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';  // Changement ici
import { SecurityService } from './modules/security/security.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const securityService = app.get(SecurityService);
  
  // Security middleware
  app.use(helmet());  // Simplifié ici
  
  // CORS
  app.enableCors(securityService.getCorsConfig());
  
  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Démarrage
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();