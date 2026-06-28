import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import * as Joi from 'joi';

function validateEnv(): void {
  const schema = Joi.object({
    DATABASE_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    REDIS_HOST: Joi.string().default('127.0.0.1'),
    REDIS_PORT: Joi.number().default(6379),
    CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  }).unknown(true);

  const { error } = schema.validate(process.env, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => `  • ${d.message}`).join('\n');
    throw new Error(`Geçersiz ortam değişkenleri:\n${messages}`);
  }
}

async function bootstrap() {
  validateEnv();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // 🔹 Proxy güveni – gerçek istemci IP'si için (rate limit, brute force)
  app.set('trust proxy', 1);

  // 🔹 HTTP güvenlik başlıkları (CSP, HSTS, X-Frame-Options vb.)
  app.use(
    helmet({
      // Frontend (5173) -> backend static (/uploads) görselleri için CORP engelini kaldır
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );

  // 🔹 CORS ayarları - static dosya yanıtlarına da uygulanması için useStaticAssets'tan ÖNCE
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: configService.corsCredentials,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Authorization, X-Membership-Inquiry-Token',
  });

  // 🔹 Uploads dizinleri - VPS/Docker'da yazma izni ve yol tutarlılığı için startup'ta oluştur
  const uploadsRoot = join(process.cwd(), 'uploads');
  for (const sub of ['logos', 'header-paper']) {
    const dir = join(uploadsRoot, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      logger.log(`Upload dizini oluşturuldu: ${dir}`);
    }
  }

  // 🔹 Static file serving - uploads klasörünü serve et
  // process.cwd() kullanarak hem development hem production'da çalışmasını sağla
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads',
  });

  // 🔹 JSON body limit (base64 image gibi büyük payload'lar için)
  // Default limit (~100kb) üye kartı fotoğrafı gibi alanlarda 413/500 hatasına sebep olabiliyor.
  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

  // 🔹 Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan property'leri otomatik kaldır
      forbidNonWhitelisted: true, // Tanımlı olmayan property varsa hata fırlat
      transform: true, // Gelen veriyi DTO tipine otomatik dönüştür
      transformOptions: {
        enableImplicitConversion: true, // String'leri number'a otomatik çevir
      },
    }),
  );

  // 🔹 Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 🔹 Swagger – yalnızca development ortamında aktif
  if (configService.isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('Yönetim Paneli API')
      .setDescription('Yönetim Paneli Backend API Dokümantasyonu')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(
      `Swagger documentation: http://localhost:${configService.port}/api`,
    );
  }

  await app.listen(configService.port);
  logger.log(`Application is running on: http://localhost:${configService.port}`);
}
bootstrap();
