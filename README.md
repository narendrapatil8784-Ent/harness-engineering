# MyStreeT – Sneaker Shopping Application

A full-stack sneaker shopping web application built with React + Spring Boot. Users can browse, filter, and purchase sneakers; admins manage the product catalog. All data is stored in an H2 in-memory database that seeds automatically on each startup.

---

## Prerequisites

| Tool | Version |
|---|---|
| Java | 17+ |
| Maven | 3.9+ (or use `./mvnw` wrapper) |
| Node.js | 18+ |
| npm | 9+ |

---

## Running the Application

### 1. Start the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The backend starts on **http://localhost:8080**. Seed data (3 users + 12 products) loads automatically.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**. Vite proxies all `/api/*` requests to the backend.

---

## Access URLs

| URL | Purpose |
|---|---|
| http://localhost:5173 | React UI |
| http://localhost:8080/swagger-ui.html | Swagger / OpenAPI docs |
| http://localhost:8080/h2-console | H2 browser console |
| http://localhost:8080/api/products | REST API (example) |

**H2 Console login:**
- JDBC URL: `jdbc:h2:mem:mystreetdb`
- User: `sa`
- Password: *(leave blank)*

---

## Default Credentials (Seed Data)

| Email | Password | Role |
|---|---|---|
| admin@mystreet.com | Admin@123 | Admin |
| john.doe@example.com | User@123 | User |
| sara.james@example.com | User@123 | User |

---

## Seed Data Note

The database is **H2 in-memory** — all data resets on every server restart. The seed data (`data.sql`) runs automatically on each boot, so the catalog is always populated. User-placed orders do not persist across restarts.

---

## Running Backend Tests

```bash
cd backend
./mvnw test
```

JaCoCo coverage report is generated at:
```
backend/target/site/jacoco/index.html
```

Open this file in a browser to view method-level coverage (target: ≥60%).

---

## Project Structure

```
mstreet-capstone/
├── plan.md                        # Project plan and requirements
├── README.md                      # This file
├── backend/                       # Spring Boot 3.x + Java 17
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/mystreet/
│       │   ├── config/            # SecurityConfig, OpenApiConfig
│       │   ├── controller/        # AuthController, ProductController, OrderController
│       │   ├── dto/               # Request/Response DTOs
│       │   ├── entity/            # JPA entities
│       │   ├── exception/         # GlobalExceptionHandler, custom exceptions
│       │   ├── repository/        # Spring Data repositories
│       │   ├── security/          # JwtUtil, JwtFilter, UserDetailsServiceImpl
│       │   └── service/           # AuthService, ProductService, OrderService
│       └── main/resources/
│           ├── application.yml    # H2 config, JWT config
│           └── data.sql           # Seed data
├── frontend/                      # React 18 + Vite + TypeScript
│   └── src/
│       ├── api/                   # Axios wrappers
│       ├── components/            # Navbar, ProductCard, ProtectedRoute
│       ├── context/               # AuthContext, CartContext
│       ├── pages/                 # All page components
│       └── types/                 # TypeScript interfaces
└── postman/
    └── mystreet-collection.json   # Postman collection
```

---

## API Endpoints

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user, returns JWT |
| POST | /api/auth/login | Public | Login, returns JWT |

### Products
| Method | Path | Access | Description |
|---|---|---|---|
| GET | /api/products | Public | List all; filter by `?brand=` and `?size=` |
| GET | /api/products/{id} | Public | Get product by ID |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/{id} | Admin | Update product |
| DELETE | /api/products/{id} | Admin | Delete product |

### Orders
| Method | Path | Access | Description |
|---|---|---|---|
| POST | /api/orders | Authenticated | Place order |
| GET | /api/orders/mine | Authenticated | Get current user's orders |
| GET | /api/orders/{id} | Authenticated (owner) | Get order details |

---

## JWT Trade-off Note

JWT was chosen over sessions for stateless auth — no server-side session storage is needed, making the API easier to scale. The trade-off is tokens cannot be invalidated server-side before expiry; this is mitigated by a short 1-hour expiry (`app.jwt.expiration-ms: 3600000`) and client-side logout that clears the token from localStorage.

---

## AI Usage Log

| Area | Prompt Summary | Output Used |
|---|---|---|
| Backend | Full implementation plan from plan.md | Used as specification |
| Backend entities | Entity design for User, Product, Order, OrderItem with JPA annotations | Adapted all entity classes |
| Security | JWT filter and Spring Security 6 config with stateless session | Adapted JwtFilter and SecurityConfig |
| Services | AuthService, ProductService, OrderService with admin checks | Implemented from plan patterns |
| Frontend | AuthContext with localStorage hydration on mount | Adapted context pattern |
| Frontend | CartContext with localStorage persistence and composite key | Adapted cart logic |
| Tests | JUnit 5 + Mockito tests for all service methods | Implemented from plan specs |

---

## Non-Functional Notes

- All passwords are BCrypt-hashed; plain text is never stored or logged
- JWT secret is externalized to `application.yml`
- Server-side validation on all POST/PUT request bodies (`@Valid`)
- CORS configured to allow only `http://localhost:5173`
- Structured JSON error responses for all 4xx/5xx codes
