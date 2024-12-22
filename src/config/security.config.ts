// src/config/security.config.ts
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSecurity(app: INestApplication) {
  const config = app.get(ConfigService);

  // CORS
  app.enableCors({
    origin: config.get('ALLOWED_ORIGINS', 'http://localhost:3000'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Helmet
  app.use(helmet());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CDN API')
    .setDescription('API Documentation for CDN')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}