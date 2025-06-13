# Prueba Técnica · Backend Multi-Tenant en Cloudflare Workers

## 1. Bienvenida

¡Bienvenido(a) a nuestra prueba técnica!  
Diseñarás y construirás un **mini-SaaS multi-tenant** sobre la plataforma **Cloudflare Workers**.  
El objetivo es evaluar tu capacidad para:

* Modelar datos relacionales multi-tenant.  
* Implementar autenticación y autorización robustas (JWT + RBAC).  
* Aplicar buenas prácticas de seguridad y rendimiento en el edge.  

Te sugerimos completar el reto en un plazo **aproximado de 72 horas** desde que lo recibas.  
¡Mucho éxito!

---

## 2. Requisitos de Entorno

| Herramienta           | Versión mínima | Notas                                                                                   |
|-----------------------|---------------:|-----------------------------------------------------------------------------------------|
| **Node.js**           | 18             | Recomendado: LTS actual.                                                                |
| **Wrangler CLI**      | 3.x            | Instala: `npm i -g wrangler`.                                                           |
| **Git**               | —              | Crea un repo en GitHub (público o privado).                                             |
| **Cuenta Cloudflare** | gratuita       | Activa **Workers**, **D1**, **KV** y opcionalmente **R2**.                              |
| **Editor de código**  | —              | Sugerencia: Visual Studio Code.                                                         |

---

## 3. Flujo de Trabajo

1. **Crea un repositorio** en GitHub.  
2. Crea una rama con tu nombre y trabaja sobre ella.
3. Haz **commits atómicos** y usa mensajes descriptivos (se agradece Conventional Commits).  
4. Cuando termines (o al cumplirse 72 h) abre un **Pull Request** a tu rama `main` con:  
   * Observaciones sobre limitaciones o mejoras pendientes.  
   * La **URL en producción** de tu Worker (`wrangler deploy`).  
   * Instrucciones para probar tu API (headers, credenciales seed, etc.).  
5. Comparte el enlace al Pull Request para la revisión.

---

## 4. Requisitos Funcionales

### 4.1 – Modelo de Datos (Drizzle + D1)

Todas las tablas están **scopeadas por `tenant_id`**.

| Tabla          | Campos clave                                                      |
|----------------|-------------------------------------------------------------------|
| `tenants`      | `id`, `name`                                                      |
| `users`        | `id`, `email`, `password_hash`, `role`, `tenant_id`               |
| `projects`     | `id`, `name`, `tenant_id`, `owner_user_id`                        |
| `tasks`        | `id`, `title`, `status`, `project_id`, `assignee_user_id`         |
| `attachments`¹ | `id`, `filename`, `url_r2`, `task_id`                             |

¹  **Tabla opcional** — inclúyela **solo si decides almacenar archivos en R2**.


* Genera las migraciones con **Drizzle Kit** (`drizzle-kit generate`).  
* Agrega un comando `npm run db:seed` que inserte datos de ejemplo como un usuario **`admin@acme.com` / `Passw0rd!`** en el tenant de ejemplo que este asociado al usuario.

### 4.2 – Autenticación y Autorización

| Endpoint             | Descripción                                                                             |
|----------------------|-----------------------------------------------------------------------------------------|
| `POST /auth/login`   | Recibe `email` + `password`. Devuelve **Access-Token JWT** (15 min) y **Refresh-Token** (7 días). |
| `POST /auth/refresh` | Devuelve un nuevo Access-Token a partir del Refresh-Token.                              |
| `POST /auth/logout`  | Revoca el Refresh-Token.                                                                |

* Los Refresh-Tokens se almacenan en **Workers KV** (`kv_sessions`).  
* Middleware `verifyJWT` (Hono) inyecta `c.var.user`.  
* Middleware `authorize(role[])` verifica el rol contra la tabla `users` y `tenant_id`.  

#### Roles y Permisos

| Rol      | Permisos clave                          |
|----------|-----------------------------------------|
| `admin`  | Control total del tenant                |
| `member` | CRUD de tareas + lectura de proyectos   |
| `viewer` | Solo lectura                            |

### 4.3 – API Protegida

| Método & Ruta              | Permisos requeridos              | Descripción                                             |
|----------------------------|----------------------------------|---------------------------------------------------------|
| `GET  /projects`           | `admin`, `member`, `viewer`      | Listar proyectos del tenant.                            |
| `POST /projects`           | `admin`, `member`                | Crear proyecto.                                         |
| CRUD `/projects/:id/tasks` | Según rol                        | Operaciones anidadas sobre tareas (valida con Zod).     |

* **Todos los SELECT** deben filtrar por `tenant_id`.  

### 4.4 – Seguridad Adicional

* **Rate-limit por IP**: 60 peticiones/min (usa `@hono/ratelimit` + KV).  
* **Rate-limit por API-Key**: 1 000 peticiones/día (cabecera `X-API-Key`).  
* **CORS estricto**: whitelisting de `Origin`.  
* **Validación de esquemas**: Zod para body, params y query.  

---

## 5. Despliegue

1. Configura `wrangler.toml` / `wrangler.jsonc` con:  
   * Bindings de **D1**, **KV** y (opcional) **R2**.  
   * Variables de entorno (JWT secret, API-Key, etc.).  
2. Despliega con `wrangler deploy`.  
3. Verifica que la **URL pública** esté operativa y accesible.

---

## 6. Recursos Útiles

> Bibliografía, ejemplos y utilidades recomendadas para completar la prueba.

* **Cloudflare Workers** – <https://developers.cloudflare.com/workers>  
* **Wrangler CLI** – <https://developers.cloudflare.com/workers/wrangler/>  
* **D1 Database** – <https://developers.cloudflare.com/d1>  
* **Workers KV** – <https://developers.cloudflare.com/workers/kv>  
* **R2 Object Storage** – <https://developers.cloudflare.com/r2>  

### Framework & ORM
* **Hono** – <https://hono.dev/docs/getting-started/cloudflare-workers>  
  * Middleware:  
    * `@hono/jwt` – Firma y verificación de JWT.  
    * `@hono/validator` – Integración de validaciones con Zod.  
    * `@hono/ratelimit` – Rate-limiting usando KV.  
* **Drizzle ORM** – <https://orm.drizzle.team/docs/connect-cloudflare-d1>  
  * **Drizzle Kit** – CLI para generar migraciones y tipos de forma segura.  

### Validación de Datos
* **Zod** – <https://github.com/colinhacks/zod> – Esquemas y validaciones TypeScript-first.  

### Autenticación & Criptografía
* **jose** – <https://github.com/panva/jose> – Librería de JWT/JWE/JWK compatible con Workers.  

### Generación de Identificadores Únicos
* **snowflake-id** – <https://github.com/windust/snowflake-id> – IDs distribuidos con timestamp.  
* **uuid** – <https://github.com/uuidjs/uuid> – Generación de UUID v4 (o v1/v5).  
* **nanoid** – <https://github.com/ai/nanoid> – IDs cortos, seguros y URL-friendly.

### Ejemplos y Tutoriales
* **Comentarios API (Workers + Hono + D1)** – <https://developers.cloudflare.com/d1/tutorials/build-a-comments-api/>  

---

## 7. Presentación

1. Sube todo tu código al repositorio.  
2. Abre el Pull Request siguiendo la sección 3.  
3. Incluye:  
   * Aspectos que faltaron o podrían mejorarse.  
   * **URL en producción** de tu Worker.  

¡Gracias por participar y mucho éxito!