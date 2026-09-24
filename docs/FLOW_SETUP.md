# Configuración de Flow.cl

## 1. Crear cuenta sandbox

1. Regístrate en https://sandbox.flow.cl (el sandbox no requiere datos reales).
2. En "Mis datos" → pestaña **Integraciones** obtén tu `apiKey` y `secretKey`.
3. Colócalas en `apps/api/.env`:
   ```
   FLOW_ENV=sandbox
   FLOW_API_URL=https://sandbox.flow.cl/api
   FLOW_API_KEY=tu-api-key
   FLOW_SECRET_KEY=tu-secret-key
   ```

## 2. Crear el plan de suscripción

El backend asume que el plan existe y se identifica con `FLOW_PLAN_ID`.

Desde el **portal de Flow** (recomendado):
- Sección **Suscripciones → Planes** → crear plan "Premium".
- Monto: 4990 CLP, frecuencia mensual.
- **URL de confirmación** (`urlConfirmation`): `https://<tu-api-railway>/api/billing/webhook`
  (en local puedes usar `http://localhost:3000/api/billing/webhook`, pero para
  pruebas reales del webhook necesitas exponer tu API, p. ej. con un túnel).

También puedes crearlo por API con `plans/create` (mismos parámetros: monto,
frecuencia, urlConfirmation).

Copia el `planId` resultante a `.env`:
```
FLOW_PLAN_ID=id-del-plan
```

## 3. Probar el flujo

> **Importante (sandbox)**: Flow sandbox puede restringir los emails de prueba
> y devolver `email is not valid` para cualquier dirección que no sea el email
> del titular de la cuenta. Si te pasa, prueba registrándote en la app con el
> **mismo email de tu cuenta de Flow** (el que usaste al registrarte en
> sandbox.flow.cl). En producción los emails de clientes reales funcionan
> normalmente.

1. Entra a la app con cualquier usuario.
2. **Plan** → "Mejorar a Premium" → el backend llama `customer/create` y te
   redirige a Flow para registrar la tarjeta.
3. Tarjeta de prueba sandbox (Chile):
   - N°: `4051885600446623` · Vencimiento: cualquiera · CVV: `123`
   - Simulador del banco: RUT `11111111-1` · Clave `123`
4. Al volver, la app verifica la tarjeta con `customer/get` y muestra
   "Activar Premium" → `subscription/create` crea la suscripción.
5. Con **Cargo Automático** activo, Flow cobra la tarjeta de inmediato
   (primer invoice). La app detecta el pago de dos formas:

   - **Webhook** (producción): el plan debe tener configurada la
     **URL de confirmación** apuntando a `https://<tu-api>/api/billing/webhook`.
     Edítala en el portal de Flow (Suscripciones → Planes → tu plan).
     Si `urlCallback` es `null`, Flow nunca notificará a tu backend.
   - **Sync automático** (siempre disponible): la página de Plan ejecuta
     `POST /billing/sync` al cargar y tras suscribir (con polling). Consulta
     las suscripciones del cliente y los pagos del día en Flow y activa
     Premium si hay un cobro con estado 2. Esto cubre dev local y cualquier
     fallo del webhook.

6. Verás el plan cambiar a **Premium** y los botones de audio usarán voces
   de OpenAI.

Para suscripciones recurrentes en sandbox:
- Aceptada: `5293138086430769`
- Rechazada: `4551708161768059`

## 4. Pasar a producción

1. Completa el registro en https://www.flow.cl y **contrata los medios de pago**
   (para cobros automáticos necesitas "Cargo Automático" habilitado).
2. Crea el plan en producción con `urlConfirmation` apuntando a tu Railway.
3. Cambia en Railway:
   ```
   FLOW_ENV=production
   FLOW_API_URL=https://www.flow.cl/api
   FLOW_API_KEY=<producción>   FLOW_SECRET_KEY=<producción>
   FLOW_PLAN_ID=<plan producción>
   ```

## Notas técnicas

- Todos los parámetros van firmados: claves ordenadas alfabéticamente,
  concatenadas `clave+valor` y firmadas con HMAC-SHA256 usando la `secretKey`
  (parámetro `s`). Implementado en `apps/api/src/billing/flow.service.ts`.
- El webhook llega como `POST application/x-www-form-urlencoded` con un `token`;
  el backend debe responder 200 rápido y luego consultar `payment/getStatus`.
- Estados de pago: `1` pendiente, `2` pagada, `3` rechazada, `4` anulada.
- Cancelación: `subscription/cancel` con `at_period_end=0` (inmediata).
- Ojo: `payment/getPayments` y las facturas devuelven `amount` como **string**
  (p. ej. `"44900"`); el backend normaliza con `Number()` al guardar.
