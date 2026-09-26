# Fonema — App de pronunciación en inglés con IA

Crea secciones de vocabulario, pega listas de palabras y deja que la IA genere la
traducción y una frase de ejemplo. Escucha cada palabra y frase con un clic.

- **Gratis**: voces del navegador + 50 palabras IA al mes
- **Premium**: voces de OpenAI + IA ilimitada + **Asistente IA** (chat que crea
  secciones y listas de vocabulario dentro de la app) ($4.990 CLP/mes, pagos
  con Flow.cl)

## Stack

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 + TanStack Query + Zustand | Vercel |
| Backend | NestJS + Prisma + PostgreSQL | Railway |
| Pagos | Flow.cl (suscripciones + Cargo Automático) | — |
| IA / TTS | OpenAI (gpt-4o-mini, tts-1) | — |

Monorepo pnpm con **screaming architecture**: carpetas por dominio en ambos lados.

```
apps/
├── api/src/            # NestJS
│   ├── auth/           # JWT propio (access + refresh en cookie httpOnly)
│   ├── sections/       # CRUD de secciones
│   ├── words/          # CRUD de palabras
│   ├── ai/             # Enrich por lotes con SSE + cuotas por plan
│   ├── audio/          # TTS OpenAI con caché en BD
│   ├── chat/           # Asistente IA: streaming + function-calling
│   ├── billing/        # Flow.cl: checkout, suscripción, webhook
│   └── prisma/         # schema + migraciones
└── web/src/            # React
    ├── features/       # auth, sections, audio, billing
    ├── shared/         # api client, componentes, hooks
    └── pages/          # landing + shell autenticada
```

## Desarrollo

```bash
docker compose up -d          # PostgreSQL 16 + Adminer (puerto 55432 / 8080)
pnpm install
cp .env.example .env          # ajusta las keys (las apps leen apps/api/.env)
pnpm db:migrate               # crea/actualiza el esquema
pnpm db:seed                  # usuario demo + sección "Comida"
pnpm dev                      # API en :3000 y web en :5173 (con proxy /api)
```

Usuario demo: `demo@pronunciation.app` / `demo1234`

Variables en `apps/api/.env`: `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `FLOW_*`, `BILLING_*`, `OPENAI_API_KEY`, `CORS_ORIGIN`.

> Nota: el puerto de la BD es **55432** porque 5432/5433 suelen estar ocupados
> por Postgres locales. Si quieres otro, cambia `docker-compose.yml` y `DATABASE_URL`.

## Flujo de pagos con Flow.cl

1. `POST /billing/checkout` → crea cliente en Flow (`customer/create`) y lo envía
   a registrar su tarjeta (`customer/register`) → redirige al checkout de Flow.
2. Al volver (`BILLING_RETURN_URL`), la app consulta `GET /billing/register-status`
   (`customer/get`) para verificar la tarjeta.
3. `POST /billing/subscribe` → `subscription/create` con el plan `FLOW_PLAN_ID`.
4. Flow cobra automáticamente. La activación de Premium llega por dos vías:
   - **Webhook** (`BILLING_WEBHOOK_URL`, configurada en el plan de Flow) →
     `payment/getStatus` con status 2 activa Premium.
   - **Sync** (`POST /billing/sync`): la página de Plan sincroniza con Flow al
     cargar y tras suscribir (polling). Cubre dev local y fallos del webhook.
5. `POST /billing/cancel` → `subscription/cancel` + vuelta a FREE.

Detalles de configuración de Flow en [docs/FLOW_SETUP.md](docs/FLOW_SETUP.md).

## Tests

```bash
pnpm --filter api test          # unitarios (firma HMAC de Flow)
pnpm --filter api test:e2e      # auth, secciones, límites por plan
pnpm --filter api lint && pnpm --filter web lint
```

## Deploy

### Producción actual

| Recurso | URL |
|---|---|
| Frontend (Vercel) | https://pronunciation-mu.vercel.app |
| API (Railway) | https://api-production-842b.up.railway.app |
| Postgres | Plugin de Railway |

### Frontend → Vercel

1. Importa el repo en Vercel, framework "Other".
2. Root Directory: raíz del repo (usa el `vercel.json` incluido).
3. Env: `VITE_API_URL=https://tu-api.up.railway.app`

### Backend → Railway

1. Nuevo servicio "Deploy from repo".
2. Railway detecta el `Dockerfile` de la raíz (multi-stage: Node 20, pnpm,
   prisma generate + build, migraciones al arrancar).
3. Añade el plugin **PostgreSQL** (inyecta `DATABASE_URL` automáticamente).
4. Env: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `CORS_ORIGIN=https://tu-app.vercel.app`, `FLOW_ENV`, `FLOW_API_KEY`,
   `FLOW_SECRET_KEY`, `FLOW_API_URL`, `FLOW_PLAN_ID`, `BILLING_WEBHOOK_URL`,
   `BILLING_RETURN_URL`, `OPENAI_API_KEY`, `NODE_ENV=production`.
5. En producción la cookie de refresh usa `SameSite=None; Secure` (dominios
   cruzados Vercel ↔ Railway).

## Endpoints principales

```
POST /api/auth/register|login|refresh|logout   GET /api/auth/me
GET/POST /api/sections          GET/PATCH/DELETE /api/sections/:id
POST /api/sections/:id/words    POST /api/sections/:id/enrich   (SSE)
PATCH/DELETE /api/words/:id     GET /api/words/:id/audio?mode=word|example
GET /api/billing                POST /api/billing/checkout|subscribe|cancel|sync
POST /api/billing/webhook       GET /api/billing/register-status
GET /api/chat/messages          POST /api/chat/stream   (SSE, Premium)
POST /api/chat/messages/:id/execute|dismiss   DELETE /api/chat/messages
GET /api/admin/stats            GET /api/admin/users    GET /api/admin/activity
```

### Panel de administración

Ruta `/app/admin` (solo rol `ADMIN`): métricas (usuarios, activos, secciones,
palabras IA, audios, chat, ingresos), series diarias de 30 días, eventos
principales, tabla de usuarios con búsqueda y feed de actividad.

- Los eventos se registran en `analytics_events` (register, login, secciones,
  palabras, IA, audio, chat y pagos) desde los servicios de dominio.
- Para nombrar un administrador: `UPDATE users SET role='ADMIN' WHERE email='...'`
  (en local: `docker exec pronunciation-db psql -U pronunciation -d pronunciation`;
  en Railway: `railway connect postgres`).

### Asistente IA (Premium)

Chat con streaming (gpt-4o-mini + function-calling) que propone acciones que el
usuario confirma: crear secciones o añadir palabras a secciones existentes.
Las propuestas quedan en `chat_messages` con estado `pending` hasta que el
usuario las ejecuta o descarta; el historial se guarda en BD.
