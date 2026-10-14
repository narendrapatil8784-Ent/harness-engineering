# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

### Backend (Spring Boot 3 + Java 17)
```bash
cd backend
./mvnw spring-boot:run          # Start the server on http://localhost:8080
./mvnw test                      # Run all tests with JaCoCo coverage
./mvnw clean                     # Clean build artifacts
```

### Frontend (React 18 + Vite)
```bash
cd frontend
npm install                      # Install dependencies
npm run dev                      # Start dev server on http://localhost:5173 (with /api proxy to backend)
npm run build                    # Build for production (TypeScript check + Vite bundle)
npm run lint                     # Run ESLint (strict mode, no unused vars/params)
npm run preview                  # Preview production build locally
```

### View Test Coverage
JaCoCo coverage reports are generated automatically when running tests:
```bash
cd backend
./mvnw test
# Open target/site/jacoco/index.html in a browser
```

Coverage target: **≥60%** per method.

---

## Project Overview

**MyStreeT** is a full-stack sneaker shopping application where users browse and purchase sneakers, and admins manage the product catalog.

- **Backend**: Spring Boot 3.4 API with JWT authentication, JPA/Hibernate persistence, and Swagger docs
- **Frontend**: React 18 SPA with React Router, context-based state (Auth & Cart), Axios for API calls
- **Database**: H2 in-memory with automatic seed data on every startup (3 users + 12 products)
- **Deployment**: Not containerized; designed for local development

Key architectural decisions:
- **JWT tokens** instead of sessions for stateless auth (short 1-hour expiry, client-side logout)
- **H2 in-memory** means all user data resets on restart—useful for testing, not production
- **CORS** restricted to `http://localhost:5173` only
- **Vite proxy** forwards `/api/*` requests to `http://localhost:8080`

---

## Backend Architecture (Spring Boot)

### Directory Structure
```
backend/src/main/
├── java/com/mystreet/
│   ├── config/              SecurityConfig, OpenApiConfig, DataInitializer
│   ├── controller/          AuthController, ProductController, OrderController
│   ├── service/             AuthService, ProductService, OrderService
│   ├── repository/          Spring Data JPA repos (User, Product, Order, OrderItem)
│   ├── entity/              JPA entities with @Entity, relationships, enums
│   ├── dto/                 Request/Response DTOs with @Valid annotations
│   ├── security/            JwtUtil, JwtFilter, UserDetailsServiceImpl
│   └── exception/           GlobalExceptionHandler, custom exceptions
└── resources/
    ├── application.yml      H2 config, JWT secret, server port
    └── data.sql             Seed data (loaded on every startup)
```

### Key Classes & Patterns

**SecurityConfig** (`config/SecurityConfig.java`)
- Stateless session with JWT filter
- Public endpoints: `/api/auth/**`, `/swagger-ui.html`, `/h2-console`
- Protected endpoints: all others (checked per controller)
- CORS to `http://localhost:5173`

**JwtUtil** (`security/JwtUtil.java`)
- Signs tokens with HS256 algorithm
- Extracts claims: username, roles, issuedAt
- 1-hour expiry; no server-side blacklist

**Services** (`service/`)
- **AuthService**: register/login, password hashing (BCrypt), role assignment
- **ProductService**: CRUD + filtering by brand/size
- **OrderService**: place order, retrieve user orders, compute totals

**DataInitializer** (`config/DataInitializer.java`)
- Runs on `ApplicationReadyEvent` to seed 3 users and 12 products
- Users: admin@mystreet.com (ADMIN), john.doe@example.com (USER), sara.james@example.com (USER)
- All passwords: `Admin@123` or `User@123` (BCrypt-hashed)

**Entity Relationships**
- User → Order (1:n), Order → OrderItem (1:n), OrderItem → Product (n:1)
- Order has `OrderStatus` enum (PENDING, CONFIRMED, SHIPPED, DELIVERED)
- Product has `PaymentMode` enum (CREDIT_CARD, DEBIT_CARD, UPI)

**DTOs vs Entities**
- Entities use JPA annotations (`@Entity`, `@ManyToOne`, etc.)
- DTOs are plain POJOs for request/response; validation via `@Valid` + `@NotBlank`, `@Min`, etc.
- Controllers map DTOs ↔ Entities using service methods or manual mapping

### Common Backend Edits

**Add a new API endpoint:**
1. Create DTO in `dto/`
2. Add method to service (`service/`)
3. Create `@GetMapping` / `@PostMapping` in controller
4. Document in Swagger with `@Operation` and `@ApiResponse`
5. Run `./mvnw test` to ensure no regressions

**Modify the database schema:**
1. Update entity in `entity/`
2. Update seed data in `data.sql` if needed
3. Update DTOs in `dto/`
4. Run `./mvnw spring-boot:run` to recreate the schema

**Add a test:**
1. Create test class in `backend/src/test/java/com/mystreet/...`
2. Use `@SpringBootTest` for integration tests, `@ExtendWith(MockitoExtension.class)` for unit tests
3. Mock repositories/services with `@Mock`, use `ArgumentCaptor` for verification
4. Run individual test: `./mvnw test -Dtest=ClassName#methodName`

---

## Frontend Architecture (React)

### Directory Structure
```
frontend/
├── vite.config.ts               Proxy config: /api → http://localhost:8080
├── tsconfig.json                Strict mode, no unused locals/params, ES2020 target
├── package.json                 Dependencies: React, React Router, Axios, TypeScript
└── src/
    ├── api/                     Axios instance + API modules (authApi, productApi, orderApi)
    │                            Axios interceptor auto-injects JWT Bearer token from localStorage
    ├── components/              Reusable components (Navbar, ProductCard, ProtectedRoute, etc.)
    ├── context/                 React Context for global state (AuthContext, CartContext)
    │                            Both auto-hydrate and persist to localStorage on changes
    ├── pages/                   Page components (LoginPage, ProductDetail, CheckoutPage, etc.)
    ├── types/                   TypeScript interfaces (User, Product, CartItem, OrderResponse)
    ├── utils/                   Helper functions (e.g., productImages.ts for image URL mapping)
    ├── App.tsx                  React Router setup with <Routes>, ProtectedRoute for auth
    └── main.tsx                 Entry point with React.StrictMode
```

### State Management

**AuthContext** (`context/AuthContext.tsx`)
- Stores: `user` (null or { email, isAdmin, token })
- Methods: `login(email, password)` → fetches token via authApi, stores in localStorage, updates context
- Methods: `register(email, password)` → similar flow
- Methods: `logout()` → clears localStorage, nullifies user
- Auto-hydrates from localStorage on app mount (useEffect)
- Provides `useAuth()` hook for all components
- JWT token is auto-injected by axios interceptor in all API calls

**CartContext** (`context/CartContext.tsx`)
- Stores: array of cart items with `{ product, size, quantity }`
- Composite key `"${productId}-${size}"` prevents duplicate size entries
- Auto-persists to localStorage after each mutation
- Provides `useCart()` hook; methods: `addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()`

**API Calls** (`api/*.ts`)
- All API modules (authApi, productApi, orderApi) use the shared axios instance
- JWT Bearer token is auto-injected from localStorage via axios request interceptor
- No manual header manipulation needed in components

**Key Pattern**: Contexts + hooks = single source of truth; localStorage = client-side persistence; axios interceptor = transparent token injection.

### Common Frontend Edits

**Add a new page:**
1. Create component in `pages/MyPage.tsx` with `interface MyPageProps { ... }` if needed
2. Add route in `App.tsx`: `<Route path="/my-path" element={<MyPage />} />`
3. Optionally add link to Navbar for navigation

**Add a component:**
1. Create in `components/MyComponent.tsx` with explicit prop interface (no `any`)
2. Use `useAuth()` for auth checks, `useCart()` for cart ops, both from context
3. Test locally with `npm run dev` before commit

**Call a new API endpoint:**
1. Add function in appropriate `api/*.ts` file using the shared axios instance
2. Function will auto-get JWT from interceptor; no manual header needed
3. In component, call function via `useEffect` or event handler
4. Handle error state (display toast/error message) and loading state (spinner/disabled button)

**Type safety:**
- Define all data types/interfaces in `types/index.ts`
- All component props must have explicit interfaces; no `any` types
- Use `interface` for objects, `type` for unions/primitives
- TypeScript strict mode is enabled; unused vars/params fail ESLint

**Vite proxy during dev:**
- All `/api/*` requests automatically proxy to `http://localhost:8080` (see vite.config.ts)
- No CORS errors during dev if backend is running; production would require explicit CORS

---

## Testing

### Backend Tests
- Located in `backend/src/test/java/`
- Use JUnit 5 + Mockito + Spring Test
- Coverage tracked by JaCoCo (target ≥60%)
- Run all: `./mvnw test`
- Run one: `./mvnw test -Dtest=AuthServiceTest#testRegisterSuccess`

### Frontend Tests
- ESLint only (`npm run lint`): enforces TypeScript strict mode, no unused vars/params
- Jest + React Testing Library tooling is installed but no test files yet
- Run: `npm run lint` before committing to catch type errors and unused code

---

## Access & Default Credentials

| URL | Purpose |
|---|---|
| http://localhost:5173 | React frontend |
| http://localhost:8080 | Spring Boot API |
| http://localhost:8080/swagger-ui.html | API docs |
| http://localhost:8080/h2-console | H2 database UI |

**H2 Console:**
- JDBC URL: `jdbc:h2:mem:mystreetdb`
- Username: `sa`
- Password: *(empty)*

**Test Users (auto-seeded):**
```
Email: admin@mystreet.com | Password: Admin@123 | Role: ADMIN
Email: john.doe@example.com | Password: User@123 | Role: USER
Email: sara.james@example.com | Password: User@123 | Role: USER
```

---

## Debugging & Helpful Commands

**Backend Debugging:**
```bash
cd backend
# Run a single test
./mvnw test -Dtest=AuthServiceTest#testRegisterSuccess

# Skip tests and clean build
./mvnw clean install -DskipTests

# View logs while running
./mvnw spring-boot:run -Dspring-boot.run.fork=false

# Check if port 8080 is in use (Windows)
netstat -ano | findstr :8080
```

**Frontend Debugging:**
```bash
cd frontend
# Clear node_modules and cache for a fresh install
rm -rf node_modules package-lock.json
npm install

# Run lint before committing to catch type errors
npm run lint

# Preview the production build locally
npm run build
npm run preview
```

**Database Inspection:**
- Access H2 Console at http://localhost:8080/h2-console
- Query example: `SELECT * FROM USERS;` or `SELECT * FROM ORDERS;`
- Data resets on server restart (H2 in-memory)

**API Testing:**
- Use Swagger UI at http://localhost:8080/swagger-ui.html to test endpoints interactively
- Or import `postman/mystreet-collection.json` into Postman for pre-built requests

---

## Important Notes

- **H2 In-Memory Database**: All data is lost on server restart; seed data runs automatically each startup
- **JWT Tokens**: Short-lived (1 hour), stateless, cannot be server-side invalidated before expiry
- **No Session Store**: Stateless design makes horizontal scaling easy but disallows global token revocation
- **CORS Restricted**: Only `http://localhost:5173` can call the API during production; dev uses Vite proxy instead
- **Passwords**: All BCrypt-hashed; never logged or exposed in responses
- **Admin Checks**: Product/Order modifications verify user role (`isAdmin()`) before proceeding
- **Frontend TypeScript**: Strict mode enabled; `noUnusedLocals: true`, `noUnusedParameters: true` fail ESLint → must be fixed before lint passes
- **Vite Dev Proxy**: During `npm run dev`, `/api` requests proxy to backend without CORS; only backend CORS matters in production
