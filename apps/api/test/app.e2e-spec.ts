import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface RegisterResponse {
  user: { id: string };
  accessToken: string;
}

interface SectionSummary {
  id: string;
  wordCount: number;
}

interface SectionDetail {
  words: Array<{ id: string }>;
}

function body<T>(res: request.Response): T {
  return res.body as T;
}

async function cleanupE2EUser(prisma: PrismaService): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: 'e2e@test.com' },
  });
  if (!existing) return;
  await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
  await prisma.payment.deleteMany({ where: { userId: existing.id } });
  await prisma.section.deleteMany({ where: { userId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
}

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupE2EUser(prisma);
  });

  afterAll(async () => {
    await cleanupE2EUser(prisma);
    await app.close();
  });

  it('GET /api/health responde ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => expect(body<{ status: string }>(res).status).toBe('ok'));
  });

  it('rechaza rutas protegidas sin token', () => {
    return request(app.getHttpServer()).get('/api/sections').expect(401);
  });

  it('registra un usuario y crea una sección con palabras', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'e2e@test.com', password: 'password123', name: 'E2E' })
      .expect(201);

    const token = body<RegisterResponse>(register).accessToken;
    expect(token).toBeDefined();

    const create = await request(app.getHttpServer())
      .post('/api/sections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', words: ['hello', 'world', 'hello'] })
      .expect(201);

    expect(body<SectionDetail>(create).words).toHaveLength(2);

    const list = await request(app.getHttpServer())
      .get('/api/sections')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(body<SectionSummary[]>(list)[0].wordCount).toBe(2);
  });

  it('el audio OpenAI requiere plan Premium', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(200);

    const token = body<RegisterResponse>(login).accessToken;

    const sections = await request(app.getHttpServer())
      .get('/api/sections')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const sectionId = body<SectionSummary[]>(sections)[0].id;
    const detail = await request(app.getHttpServer())
      .get(`/api/sections/${sectionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const wordId = body<SectionDetail>(detail).words[0].id;

    await request(app.getHttpServer())
      .get(`/api/words/${wordId}/audio?mode=word`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('el chat IA es exclusivo del plan Premium', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(200);

    const token = body<RegisterResponse>(login).accessToken;

    await request(app.getHttpServer())
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Crea una lista de comida' })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
