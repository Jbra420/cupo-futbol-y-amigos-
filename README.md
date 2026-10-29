# CUPO

Organiza partidos con una única cuenta administradora. Los jugadores abren el enlace del partido y se apuntan sin usuario ni contraseña. La aplicación permite crear eventos, elegir fecha y número de jugadores, reprogramar partidos, administrar cupos y espera, editar equipos y compartir la alineación.

## Acceso y permisos

- **Administrador único:** entra en `/panel` con usuario y contraseña. Puede crear partidos y editar los ya programados: nombre, fecha/hora, lugar, precio opcional y número de jugadores. También administra altas, pagos y equipos.
- **Jugadores:** entran exclusivamente por el enlace del partido. Una sesión anónima identifica su dispositivo para apuntarse o cancelar su cupo; no reciben credenciales ni permisos administrativos.
- No hay registro público de administradores ni acceso con Google. La tabla privada `private.app_administrator` admite una sola cuenta. Las rutas, RPC y RLS comprueban ese permiso; tener una cuenta de Supabase o una identidad de Google no lo concede.
- La edición de datos y capacidad se guarda en una transacción. Reducir cupos pide confirmación antes de pasar a los últimos confirmados a la espera. Un conflicto de revisión evita sobrescribir cambios concurrentes.
- El administrador puede gestionar también eventos creados antes de adoptar este modelo de acceso, sin modificar sus propietarios históricos.

## Funcionalidad

Cupos protegidos por bloqueos PostgreSQL, espera FIFO, promoción automática, Realtime, jugadores frecuentes y niveles privados, sorteo reproducible por posición y nivel, editor de lista/cancha con mouse, touch y teclado, nombres y colores de equipos, WhatsApp, PNG y Open Graph dinámico. Interfaz en español latinoamericano, clara y oscura, con objetivos táctiles de 44 px.

Stack: Next.js 15.5.28, React 19, TypeScript estricto, Tailwind 4, shadcn/ui, Supabase, PL/pgSQL, dnd-kit, html-to-image, Vitest y Playwright. Node.js 22.

## Identidad de CUPO

El logotipo vectorial original combina una C abierta, inspirada en una cancha, con un balón que representa el cupo disponible. El nombre se conserva en una sola línea en móvil y escritorio. Encabezados, favicon, icono de inicio del móvil, imágenes de alineación y Open Graph comparten la misma geometría, con colores adaptados a fondos claros y oscuros.

Los SVG de marca están en `public/brand`; la geometría editable está en `src/lib/brand.ts`. Ejecuta `npm run brand:assets` para regenerar los iconos y la [vista de identidad](artifacts/brand/cupo-identity.png). Consulta la [verificación de marca](docs/verification/brand.md).

## Ubicación en Google Maps

Al crear un partido o desde **Editar partido**, el administrador puede pegar el enlace de la cancha en **Enlace de Google Maps**. Se obtiene en Google Maps con **Compartir → Copiar enlace**. Los jugadores ven el mapa dentro del partido y pueden abrirlo con **Ver en Google Maps**. Para retirar el mapa, deja el campo vacío y guarda.

El campo es opcional y los eventos anteriores conservan su ubicación de texto. Se admiten enlaces completos, búsquedas, coordenadas, enlaces cortos `maps.app.goo.gl`/`goo.gl/maps` y redirecciones de Google Ecuador. Los enlaces cortos se resuelven en el servidor antes de guardar, con tiempo y saltos limitados a Google Maps. La aplicación muestra un iframe de Maps y no necesita una clave de Google Maps Platform. Consulta la [verificación de mapas](docs/verification/maps.md).

## Inicio local

Requisitos: Node.js 22, npm, Docker y Supabase CLI.

```sh
npm ci
supabase start -x storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta
supabase migration up --local
npm run supabase:env
npm run admin:setup -- admin
npm run dev
```

Abre [CUPO](http://localhost:3000) y entra en [Acceso del administrador](http://localhost:3000/panel). `admin:setup` crea la cuenta local `admin` y genera una contraseña aleatoria; la guarda en `.local/admin-credentials.json`, con permisos restringidos e ignorada por Git. No imprime la contraseña en los registros. Si la cuenta ya existe, no la reemplaza ni cambia su contraseña.

Para elegir una contraseña desde tu terminal, sin mostrarla mientras escribes:

```sh
npm run admin:setup -- admin --interactive
```

Si la cuenta ya existe y quieres cambiarla, agrega `--reset-password`. El script actúa únicamente sobre Supabase local y rechaza proyectos remotos. No uses las credenciales locales en producción.

`supabase:env` escribe solo las variables públicas locales y no sobrescribe un `.env.local` existente. Después de nuevas migraciones ejecuta `npm run supabase:types`. `supabase stop` conserva los datos y detiene los servicios. `supabase db reset` elimina los datos locales y reconstruye la base; úsalo únicamente en una instancia desechable.

El nombre de la aplicación, interfaz, metadatos e imágenes es **CUPO**. Las referencias anteriores a Fútbol y amigos en informes de verificación son históricas. Los identificadores de cuentas y enlaces publicados se conservan para mantener su compatibilidad.

## Variables

| Variable                               | Valor                                                         |
| -------------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL HTTPS del proyecto, o HTTP en localhost                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública publishable del mismo proyecto                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Alternativa antigua/local si no hay publishable key           |
| `NEXT_PUBLIC_SITE_URL`                 | URL pública canónica de la aplicación; opcional en local      |
| `SUPABASE_ADMIN_USERNAME`              | Solo servidor: usuario del administrador, por ejemplo `admin` |
| `SUPABASE_ADMIN_EMAIL`                 | Solo servidor: correo de su cuenta Auth existente             |

La aplicación no necesita `service_role`, contraseña de PostgreSQL ni credenciales de Google en Vercel. Las claves administrativas de los scripts locales se obtienen de Supabase CLI, permanecen en memoria y no llegan al navegador.

## Supabase alojado y cuenta administradora

1. Crea un proyecto Supabase, conecta la CLI y aplica las migraciones:

   ```sh
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

   Revisa el proyecto de destino antes de aplicar cambios remotos. No ejecutes fixtures ni las suites locales contra producción.

2. Habilita Anonymous Sign-In para los jugadores y el proveedor de contraseña de Supabase para validar la cuenta administradora. No configures Google ni vinculación de identidades. La aplicación no ofrece registro público; cualquier cuenta ajena sigue sin permiso administrativo.
3. Desde **Authentication → Users**, crea una cuenta con tu correo, una contraseña segura y confirmación automática, o conserva una cuenta confirmada que ya tengas. Para entrar como `admin`, configura en el servidor `SUPABASE_ADMIN_USERNAME=admin` y `SUPABASE_ADMIN_EMAIL` con el correo de esa cuenta. Configura siempre las dos variables juntas, sin el prefijo `NEXT_PUBLIC_`: el correo no se envía al navegador. El formulario de la aplicación pide **Usuario** y **Contraseña**; utiliza la contraseña que elegiste al crear la cuenta en Supabase.
4. Copia su UUID y asigna la única cuenta desde el editor SQL del proyecto:

   ```sql
   INSERT INTO private.app_administrator (user_id, username)
   VALUES ('UUID_DE_LA_CUENTA', 'admin');
   ```

   La restricción de la tabla impide agregar un segundo administrador. Los usuarios tienen de 3 a 40 caracteres: letras minúsculas sin acentos, números, punto, guion o guion bajo. El usuario asignado debe coincidir con `SUPABASE_ADMIN_USERNAME`. Nunca asignes el rol mediante `user_metadata`: no se usa para autorizar. Sin ambas variables, se conserva el identificador técnico `<usuario>@admin.futbolyamigos.invalid` para las cuentas locales y las instalaciones que ya lo utilizan.

5. Configura Site URL con el dominio final de la aplicación. Verifica el acceso con usuario/contraseña, cierre de sesión y creación/edición desde un dispositivo distinto. Para recuperar una contraseña alojada, actualiza únicamente esa cuenta desde el panel Auth; la aplicación no contiene un enlace público de recuperación ni registro.

Referencia: [autenticación por contraseña de Supabase](https://supabase.com/docs/guides/auth/passwords).

## Rutas y datos

| Ruta               | Uso                                          |
| ------------------ | -------------------------------------------- |
| `/`                | Presentación de CUPO                         |
| `/panel`           | Acceso y lista de partidos del administrador |
| `/panel/nuevo`     | Crear un partido                             |
| `/panel/jugadores` | Jugadores frecuentes y nivel privado         |
| `/p/[slug]`        | Inscripción, espera y alineación pública     |
| `/p/[slug]/admin`  | Administración y edición del evento          |

El algoritmo puro está en `src/lib/teams`. Todo el SQL está en `supabase/migrations`: se conservaron las migraciones originales y se agregaron las correcciones y el modelo de administrador único. Los tipos se generan desde la base real.

Las publicaciones Realtime enumeran exclusivamente columnas públicas de partidos, inscripciones, equipos y asignaciones. Conserva esos filtros; una publicación completa podría exponer campos privados. Los clientes consultan snapshots seguros después de eventos y al reconectar. Los niveles, pagos e identidades de usuario permanecen fuera de la vista pública.

La identidad del jugador pertenece a la sesión del navegador. Borrar sus cookies o cambiar de navegador genera otra identidad; el administrador puede gestionar el cupo anterior. Cambiar confirmados invalida la alineación publicada y conserva las asignaciones restantes como borrador. Los partidos finalizados quedan de consulta.

Los identificadores de los canales Realtime y las semillas del sorteo usan Nano ID con `crypto.getRandomValues()`. No dependen de `crypto.randomUUID()`, que puede faltar al abrir la aplicación por HTTP en la red local. La publicación debe usar HTTPS.

## Pruebas

Con Supabase local en ejecución:

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

Integración y E2E rechazan endpoints remotos. Las pruebas sustituyen temporalmente la cuenta administradora solo en la instancia local, usan un bloqueo para no competir y restauran la asignación anterior al terminar. Ejecútalas en una instancia local desechable, sin otras personas utilizándola; el acceso de la cuenta habitual se suspende mientras dura cada fixture. La suite E2E usa un worker por defecto porque existe un solo administrador.

La integración prueba concurrencia, promoción, permisos, ausencia de privilegios por Google/metadatos y edición atómica de fecha/cupos. Playwright comprueba usuario/contraseña reales, persistencia de sesión, cierre, creación, edición, bloqueo de jugadores, inscripción, equipos, touch, teclado, PNG, Open Graph y accesibilidad, en 390 × 844 y 1440 × 900.

La configuración local amplía los límites de Auth para estas suites. Ajusta los del proyecto alojado según su uso; no se copian al servicio alojado. Si habilitas CAPTCHA, integra primero su token en la sesión anónima. Los reportes y capturas están en `docs/verification` y `artifacts`.

Para comprobar toda la suite de navegador sobre una compilación de producción local:

```sh
npm run test:build
CUPO_VERIFY_PRODUCTION=1 NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run test:e2e
```

Este modo usa `.next-qa` y el puerto 3100 para separar la verificación del servidor de desarrollo. `test:build` toma las credenciales públicas de Supabase local, reemplaza ambos nombres de clave y vacía la asociación del administrador alojado; así las pruebas permanecen locales aunque `.env.local` apunte al proyecto alojado. Playwright inicia y detiene el servidor de pruebas; Supabase debe estar disponible en local. No configures `CUPO_VERIFY_PRODUCTION` en Vercel. La regresión de compatibilidad comprueba creación, edición, Realtime, sorteo y publicación de equipos con `crypto.randomUUID` ausente. Consulta el [informe de prepublicación](docs/verification/pre-publicacion.md) y la [configuración de Supabase alojado](docs/verification/supabase-alojado.md).

## Vercel

1. Importa el repositorio con preset **Next.js**, Node **22.x**, instalación `npm ci` y build `npm run build`. La salida se detecta automáticamente.
2. Configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_SITE_URL`. Si usas una cuenta Auth con tu propio correo, agrega también `SUPABASE_ADMIN_USERNAME` y `SUPABASE_ADMIN_EMAIL` solo en el servidor. El nombre antiguo `NEXT_PUBLIC_SUPABASE_ANON_KEY` sigue funcionando si no hay publishable key; si están ambos, se prefiere la publishable. Usa un proyecto Supabase separado para Preview si vas a probar escrituras.
3. Aplica las migraciones y configura la cuenta administradora antes de usar el despliegue. El build no modifica la base.
4. Publica y comprueba acceso del administrador, creación/edición, inscripción desde otro navegador, espera, Realtime, equipos y PNG. Si cambias variables públicas, vuelve a desplegar.

No hay dependencia de Google OAuth. La publicación requiere conectar los proyectos alojados del propietario. La hoja nativa de compartir y Safari/iOS físico quedan fuera de Chromium local. WhatsApp puede conservar su propia caché de la vista previa; abrir el enlace presenta el estado actual.

Referencias: [variables de Vercel](https://vercel.com/docs/environment-variables), [Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [metadatos Next.js 15](https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata).
