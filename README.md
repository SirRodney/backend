# Prueba Técnica · Backend Multi-Tenant en Cloudflare Workers

---

## 1. Bienvenida

¡Enhorabuena por llegar a esta prueba!
Construirás un **mini‑SaaS de gestión académica** (*Learning Management System – LMS*) que funcione de forma **multi‑tenant** sobre **Cloudflare Workers**.
Con esta prueba evaluaremos tu capacidad para:

* Modelar datos relacionales multi‑tenant.
* Implementar autenticación y autorización robustas (JWT + RBAC).
* Aplicar buenas prácticas de seguridad y rendimiento en el edge.

¡Mucho éxito 🚀!

---

## 2. Requisitos de Entorno

| Herramienta           | Versión mínima | Notas                                                        |
| --------------------- | -------------: | ------------------------------------------------------------ |
| **Node.js**           |             18 | Recomendado: LTS actual.                                     |
| **Wrangler CLI**      |            3.x | Instala con `npm i -g wrangler`.                             |
| **Git**               |              — | Crea un repo en GitHub (público o privado).                  |
| **Cuenta Cloudflare** |       gratuita | Activa **Workers**, **D1**, **KV** y **R2**. |
| **Editor de código**  |              — | Sugerencia: VS Code.                                         |

---

## 3. Flujo de Trabajo

1. **Crea un repositorio** en GitHub.
2. Trabaja en una rama con tu nombre/apellido.
3. Realiza **commits atómicos** con mensajes descriptivos (se agradece Conventional Commits).
4. Al terminar (o al cumplirse 72 h) abre un **Pull Request** hacia `main` incluyendo:

   * Limitaciones conocidas o mejoras pendientes.
   * La **URL en producción** de tu Worker (`wrangler deploy`).
   * Instrucciones de prueba (headers, credenciales, etc.).
5. Comparte el enlace del PR para la revisión.

---

## 4. Requisitos Funcionales

### 4.1 – Modelo de Datos (Drizzle + D1)

Todas las tablas están **scopeadas por `academy_id`**.

| Tabla        | Campos clave                                           |
| ------------ | ------------------------------------------------------ |
| `academies`  | `id`, `name`                                           |
| `users`      | `id`, `email`, `password_hash`, `role`, `academy_id`   |
| `courses`    | `id`, `title`, `academy_id`, `instructor_user_id`      |
| `lessons`    | `id`, `title`, `status`, `course_id`, `author_user_id` |
| `materials` | `id`, `filename`, `url_r2`, `lesson_id`                |

* Genera migraciones con **Drizzle Kit** (`drizzle‑kit generate`).

### 4.2 – Autenticación y Autorización

| Endpoint             | Descripción                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `POST /auth/login`   | Recibe `email` + `password`. Devuelve **Access‑Token JWT** (15 min) y **Refresh‑Token** (7 días). |
| `POST /auth/refresh` | Devuelve un nuevo Access‑Token usando el Refresh‑Token.                                           |
| `POST /auth/logout`  | Revoca el Refresh‑Token.                                                                          |

* Guarda los Refresh‑Tokens en **Workers KV** (`kv_sessions`).
* Middleware `verifyJWT` (Hono) añade `c.var.user`.
* Middleware `authorize(role[])` valida el rol contra la tabla `users` y `academy_id`.

#### Roles y Permisos

| Rol       | Permisos clave                              |
| --------- | ------------------------------------------- |
| `admin`   | Control total sobre la *academy*.           |
| `teacher` | CRUD de cursos y lecciones que imparte.     |
| `student` | Lectura de cursos y lecciones matriculadas. |

### 4.3 – API Protegida

| Método & Ruta               | Permisos requeridos           | Descripción                                            |
| --------------------------- | ----------------------------- | ------------------------------------------------------ |
| `GET  /courses`             | `admin`, `teacher`, `student` | Listar cursos de la *academy*.                         |
| `POST /courses`             | `admin`, `teacher`            | Crear curso.                                           |
| CRUD `/courses/:id/lessons` | Según rol                     | Operaciones anidadas sobre lecciones (valida con Zod). |

* Todos los **SELECT** deben filtrar por `academy_id`.

### 4.4 – Seguridad Adicional

* **Rate‑limit por IP:** 60 peticiones/min (`@hono-rate-limiter/cloudflare`).
* **Rate‑limit por API‑Key:** 1 000 peticiones/día (cabecera `X‑API‑Key`).
* **CORS estricto:** lista blanca de `Origin`.
* **Validación de esquemas:** Zod para *body*, *params* y *query*.

---

## 5. Despliegue

1. Configura `wrangler.toml`/`wrangler.jsonc` con:

   * Bindings de **D1**, **KV** y (opcional) **R2**.
   * Variables de entorno (JWT secret, API‑Key, etc.).
2. Ejecuta `wrangler deploy`.
3. Comprueba que la **URL pública** responda correctamente.

---

## 6. Recursos Útiles

> Documentación y ejemplos recomendados.

* **Cloudflare Workers** – [https://developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
* **Wrangler CLI** – [https://developers.cloudflare.com/workers/wrangler/](https://developers.cloudflare.com/workers/wrangler/)
* **D1 Database** – [https://developers.cloudflare.com/d1](https://developers.cloudflare.com/d1)
* **Workers KV** – [https://developers.cloudflare.com/workers/kv](https://developers.cloudflare.com/workers/kv)
* **R2 Object Storage** – [https://developers.cloudflare.com/r2](https://developers.cloudflare.com/r2)

### Framework & ORM

* **Hono** – [https://hono.dev/docs/getting-started/cloudflare-workers](https://hono.dev/docs/getting-started/cloudflare-workers)

  * Middleware:

    * `@hono/jwt` – Firma / verificación de JWT.
    * `@hono/validator / @hono/zod-validator` – Validaciones con Zod.
    * `@hono-rate-limiter/cloudflare` – Rate‑limiting usando KV.
* **Drizzle ORM** – [https://orm.drizzle.team/docs/connect-cloudflare-d1](https://orm.drizzle.team/docs/connect-cloudflare-d1)

  * **Drizzle Kit** – CLI de migraciones y tipos.

### Validación

* **Zod** – [https://github.com/colinhacks/zod](https://github.com/colinhacks/zod)

### Autenticación

* **jose** – [https://github.com/panva/jose](https://github.com/panva/jose)

### IDs Únicos

* **snowflake-id**, **uuid**, **nanoid** (elige la que prefieras).

### Ejemplo

* **Comments API (Workers + Hono + D1)** – [https://developers.cloudflare.com/d1/tutorials/build-a-comments-api/](https://developers.cloudflare.com/d1/tutorials/build-a-comments-api/)

---

## 7. Presentación

1. Sube el código al repo.
2. Abre el Pull Request indicado en la sección 3.
3. Incluye:

   * Aspectos que faltaron o podrían mejorarse.
   * **URL en producción** de tu Worker.

---

### ¡Gracias por participar y mucho éxito en tu camino para unirte a nuestro equipo! 🎓
