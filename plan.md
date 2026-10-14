# MyStreeT – Capstone Project Plan

## 1. Project Overview

A full-stack sneaker shopping web application demonstrating foundational skills across React, Spring Boot, REST APIs, Git, and basic testing. Users can browse, filter, and purchase sneakers; admins manage the product catalog. The database is H2 in-memory—zero external setup required; seed data loads automatically on every startup.

---

## 2. Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite + TypeScript | Wider industry adoption; Vite is faster than CRA |
| Styling | CSS Modules + basic CSS | No extra dependency; keeps focus on logic |
| State | React Context API + localStorage | Sufficient for this scale; no Redux overhead |
| Auth | JWT (stateless) | No server-side session storage needed; simpler REST |
| Backend | Spring Boot 3.x, Java 17 | LTS, modern records, spring-security 6 |
| DB | H2 in-memory (sole database) | Zero external setup; schema auto-created; seed data runs on every boot |
| ORM | Spring Data JPA / Hibernate | `ddl-auto=create-drop`; schema driven by entity annotations |
| Build | Maven | Standard Spring Boot tooling |
| API Docs | SpringDoc OpenAPI (Swagger UI) | Auto-generates from annotations |
| Testing | JUnit 5 + Mockito | Standard Spring Boot test stack |

---

## 3. Repository Structure

```
mstreet-capstone/
├── plan.md                        # This file
├── README.md                      # Setup, seed, run instructions
├── backend/                       # Spring Boot application
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/mystreet/
│       │   │   ├── MyStreetApplication.java
│       │   │   ├── config/
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   └── OpenApiConfig.java
│       │   │   ├── controller/
│       │   │   │   ├── AuthController.java
│       │   │   │   ├── ProductController.java
│       │   │   │   └── OrderController.java
│       │   │   ├── dto/
│       │   │   │   ├── RegisterRequest.java
│       │   │   │   ├── LoginRequest.java
│       │   │   │   ├── AuthResponse.java
│       │   │   │   ├── ProductRequest.java
│       │   │   │   ├── ProductResponse.java
│       │   │   │   ├── OrderRequest.java
│       │   │   │   ├── OrderResponse.java
│       │   │   │   └── ErrorResponse.java
│       │   │   ├── entity/
│       │   │   │   ├── User.java
│       │   │   │   ├── Product.java
│       │   │   │   ├── Order.java
│       │   │   │   └── OrderItem.java
│       │   │   ├── repository/
│       │   │   │   ├── UserRepository.java
│       │   │   │   ├── ProductRepository.java
│       │   │   │   ├── OrderRepository.java
│       │   │   │   └── OrderItemRepository.java
│       │   │   ├── service/
│       │   │   │   ├── AuthService.java
│       │   │   │   ├── ProductService.java
│       │   │   │   └── OrderService.java
│       │   │   ├── security/
│       │   │   │   ├── JwtUtil.java
│       │   │   │   ├── JwtFilter.java
│       │   │   │   └── UserDetailsServiceImpl.java
│       │   │   └── exception/
│       │   │       ├── GlobalExceptionHandler.java
│       │   │       ├── ResourceNotFoundException.java
│       │   │       └── ForbiddenException.java
│       │   └── resources/
│       │       ├── application.yml        # H2 in-memory config (single profile)
│       │       └── data.sql               # Seed data — loaded automatically on startup
│       └── test/
│           └── java/com/mystreet/
│               ├── service/
│               │   ├── AuthServiceTest.java
│               │   ├── ProductServiceTest.java
│               │   └── OrderServiceTest.java
│               └── repository/
│                   └── ProductRepositoryTest.java
├── frontend/                      # React + Vite + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   ├── authApi.ts
│       │   ├── productApi.ts
│       │   └── orderApi.ts
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── CartContext.tsx
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── ProductCard.tsx
│       │   ├── CartItem.tsx
│       │   └── ProtectedRoute.tsx
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── ProductDetailPage.tsx
│       │   ├── CartPage.tsx
│       │   ├── CheckoutPage.tsx
│       │   ├── OrderConfirmationPage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   └── admin/
│       │       └── AdminProductsPage.tsx
│       └── types/
│           └── index.ts
└── postman/
    └── mystreet-collection.json   # Postman collection for all APIs
```

---

## 4. Data Model

### Entity: User
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| email | VARCHAR(255) | Unique, not null |
| password_hash | VARCHAR(255) | BCrypt |
| is_admin | BOOLEAN | Default false |
| created_at | TIMESTAMP | Auto |

### Entity: Product
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| name | VARCHAR(255) | Not null |
| brand | VARCHAR(100) | Not null |
| description | TEXT | |
| price | DECIMAL(10,2) | Not null |
| image_url | VARCHAR(500) | |
| sizes_csv | VARCHAR(100) | e.g., "7,8,9,10" |
| stock_qty | INTEGER | Default 0 |
| created_at | TIMESTAMP | Auto |

### Entity: Order
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| user_id | UUID | FK → User |
| shipping_address | TEXT | Not null |
| payment_mode | VARCHAR(50) | CASH_ON_DELIVERY or MOCK_UPI |
| status | VARCHAR(50) | Default PLACED |
| total_amount | DECIMAL(10,2) | Calculated |
| created_at | TIMESTAMP | Auto |

### Entity: OrderItem
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, generated |
| order_id | UUID | FK → Order |
| product_id | UUID | FK → Product |
| product_name | VARCHAR(255) | Snapshot at time of order |
| size | VARCHAR(10) | Selected size |
| quantity | INTEGER | |
| unit_price | DECIMAL(10,2) | Snapshot at time of order |

**Relationships:**
- User (1) → (M) Order
- Order (1) → (M) OrderItem
- Product (1) → (M) OrderItem

---

## 5. API Contracts

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login, returns JWT |

### Products
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/products | Public | List all, filter by ?brand= and ?size= |
| GET | /api/products/{id} | Public | Get product by ID |
| POST | /api/products | Admin | Create product |
| PUT | /api/products/{id} | Admin | Update product |
| DELETE | /api/products/{id} | Admin | Delete product |

### Orders
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/orders | User | Create order from cart |
| GET | /api/orders/mine | User | List current user's orders |
| GET | /api/orders/{id} | User (owner) | Get order details |

### Error Response Shape (all errors)
```json
{
  "timestamp": "2025-09-12T12:00:00Z",
  "path": "/api/orders",
  "error": "VALIDATION_ERROR",
  "message": "Shipping address is required"
}
```

### JWT Trade-off Note (for README)
- **JWT chosen over sessions**: stateless—no server memory for session store; easier to scale; standard for REST APIs.
- Trade-off: tokens cannot be invalidated server-side before expiry; mitigated by short expiry (e.g., 1 hour) and logout simply clearing the client-side token.

---

## 6. Frontend Routes

| Route | Component | Access |
|---|---|---|
| / | HomePage | Public |
| /products/:id | ProductDetailPage | Public |
| /cart | CartPage | Public |
| /checkout | CheckoutPage | User (authenticated) |
| /order-confirmation/:id | OrderConfirmationPage | User (authenticated) |
| /login | LoginPage | Public |
| /register | RegisterPage | Public |
| /admin/products | AdminProductsPage | Admin only |

---

## 7. Sprint Plan

### Sprint 1 – Foundations & Catalog (Week 1)

**Goal:** Running project skeleton with product browsing working end-to-end.

**Backend tasks:**
- [ ] Initialize Spring Boot project (Maven, dependencies: Web, JPA, H2, Security, Validation, SpringDoc)
- [ ] Configure `application.yml` — H2 in-memory, H2 console enabled, `ddl-auto=create-drop`, `sql.init.mode=always`
- [ ] Create `Product` entity and `ProductRepository`
- [ ] Create `ProductService` with list (with brand/size filter) and getById
- [ ] Create `ProductController` (GET /api/products, GET /api/products/{id})
- [ ] Create `GlobalExceptionHandler` with structured error response
- [ ] Add seed data (`data.sql`) with at least 8 products
- [ ] Configure OpenAPI / Swagger UI

**Frontend tasks:**
- [ ] Scaffold React + Vite + TypeScript project
- [ ] Set up React Router with route definitions
- [ ] Create `productApi.ts` (axios/fetch wrappers)
- [ ] Build `Navbar` component
- [ ] Build `HomePage` with product grid and brand/size filter controls
- [ ] Build `ProductCard` component
- [ ] Build `ProductDetailPage` with size selector and "Add to Cart" button (cart wired in Sprint 2)

**Done criteria:**
- Guest can open the app, see 8+ products, filter by brand/size, click into a detail page
- Swagger UI accessible at `/swagger-ui.html`

---

### Sprint 2 – Auth & Cart (Week 2)

**Goal:** Users can register, log in, and manage a persistent cart.

**Backend tasks:**
- [ ] Add `User` entity and `UserRepository`
- [ ] Add Spring Security config (permit public routes, protect admin/user routes)
- [ ] Implement `JwtUtil` (generate, validate tokens)
- [ ] Implement `JwtFilter` (extract token from `Authorization: Bearer` header)
- [ ] Implement `AuthService` (register with BCrypt, login)
- [ ] Create `AuthController` (POST /api/auth/register, POST /api/auth/login)
- [ ] Add `isAdmin` check in `ProductController` for POST/PUT/DELETE (return 403 if not admin)
- [ ] Input validation with `@Valid` on DTOs, handled in `GlobalExceptionHandler`

**Frontend tasks:**
- [ ] Create `AuthContext` (stores JWT + user info + isAdmin in localStorage)
- [ ] Build `LoginPage` and `RegisterPage` with forms and error display
- [ ] Create `ProtectedRoute` component (redirects to /login if not authenticated, to / if not admin)
- [ ] Wrap `/checkout` with ProtectedRoute (user), `/admin/products` with ProtectedRoute (admin)
- [ ] Create `CartContext` (cart state persisted to localStorage)
- [ ] Build `CartPage` with item list, quantity controls, remove, and running total
- [ ] Wire "Add to Cart" on `ProductDetailPage` into `CartContext`
- [ ] Show cart item count badge in Navbar
- [ ] Show/hide "Manage Products" nav link based on `isAdmin`

**Done criteria:**
- Register with new email → login → JWT stored → page refresh keeps user logged in
- Cart items survive page refresh via localStorage
- Non-admin JWT receives 403 on admin product endpoints

---

### Sprint 3 – Checkout, Orders & Admin CRUD (Week 3)

**Goal:** Complete shopping flow and admin product management; polish and test.

**Backend tasks:**
- [ ] Create `Order`, `OrderItem` entities and repositories
- [ ] Create `OrderService` (create order: validate stock, decrement stock_qty, persist, return order ID)
- [ ] Create `OrderController` (POST /api/orders, GET /api/orders/mine, GET /api/orders/{id})
- [ ] Ensure order endpoints check authenticated user; GET /orders/{id} validates ownership
- [ ] Write `AuthServiceTest`, `ProductServiceTest`, `OrderServiceTest` (JUnit 5 + Mockito)
- [ ] Write `ProductRepositoryTest` (Spring Data JPA slice test)
- [ ] Achieve ≥60% method-level coverage (verify with Maven Surefire/JaCoCo)

**Frontend tasks:**
- [ ] Build `CheckoutPage` (shipping address form, payment mode radio: Cash on Delivery / Mock UPI, Place Order button)
- [ ] Call POST /api/orders on form submit; clear cart on success
- [ ] Build `OrderConfirmationPage` (show Order ID, item summary, shipping address)
- [ ] Build `AdminProductsPage` (product table with Edit/Delete, Add Product form/modal)
- [ ] Wire admin product form to POST/PUT/DELETE /api/products
- [ ] Toast notifications for success/error actions across the app
- [ ] Polish responsive layout for product grid and cart

**Final tasks:**
- [ ] Write `README.md` (setup steps, seed data instructions, run commands, AI usage log)
- [ ] Export Postman collection covering all API endpoints
- [ ] Run manual Postman tests for all happy-path and error scenarios
- [ ] ESLint clean pass on frontend; no critical warnings

**Done criteria:**
- Full user flow: browse → detail → add to cart → register/login → checkout → order confirmation
- Admin can add a product and see it on the catalog immediately
- All backend unit tests pass; coverage ≥60%
- Postman collection runs without errors

---

## 8. Seed Data

H2 loads `src/main/resources/data.sql` automatically on every startup because `spring.sql.init.mode=always` and `ddl-auto=create-drop` (schema is always fresh). All inserts use H2-native `RANDOM_UUID()` and `CURRENT_TIMESTAMP`.

> **Note:** Because the database is in-memory, all data—including user-created orders—resets when the server restarts. The seed below runs on every boot, so the catalog is always available without manual intervention.

### H2-Compatible `application.yml` settings

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:mystreetdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password:
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: false
    open-in-view: false
  sql:
    init:
      mode: always
```

### Users

| Email | Password (plain) | Is Admin |
|---|---|---|
| admin@mystreet.com | Admin@123 | true |
| john.doe@example.com | User@123 | false |
| sara.james@example.com | User@123 | false |

BCrypt hash for `Admin@123`:
`$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.`

BCrypt hash for `User@123`:
`$2a$10$TwSHmcBDfVxNxgVNDAkO1ePbYtT6RqgTFbXDX5W2nXOiAILWaKB5S`

> Generate fresh hashes with: `new BCryptPasswordEncoder().encode("Admin@123")` in a Spring Boot test or use an online BCrypt tool to replace these before seeding.

### Products (12 products, 5 brands)

| # | Name | Brand | Price | Sizes | Stock |
|---|---|---|---|---|---|
| 1 | Air Max 90 | Nike | $119.99 | 6,7,8,9,10,11,12 | 60 |
| 2 | Air Force 1 Low | Nike | $109.99 | 6,7,8,9,10,11,12,13 | 80 |
| 3 | React Infinity Run FK 3 | Nike | $159.99 | 7,8,9,10,11,12 | 40 |
| 4 | Dunk Low Retro | Nike | $114.99 | 5,6,7,8,9,10,11,12 | 35 |
| 5 | Ultraboost 22 | Adidas | $189.99 | 6,7,8,9,10,11,12 | 45 |
| 6 | Stan Smith | Adidas | $89.99 | 5,6,7,8,9,10,11,12 | 70 |
| 7 | NMD_R1 | Adidas | $139.99 | 6,7,8,9,10,11 | 30 |
| 8 | Gazelle Bold | Adidas | $109.99 | 5,6,7,8,9,10,11 | 25 |
| 9 | 990v5 Made in USA | New Balance | $184.99 | 7,8,9,10,11,12,13 | 20 |
| 10 | 574 Core | New Balance | $79.99 | 6,7,8,9,10,11,12 | 55 |
| 11 | Old Skool | Vans | $69.99 | 4,5,6,7,8,9,10,11,12,13 | 90 |
| 12 | Authentic Canvas | Vans | $59.99 | 4,5,6,7,8,9,10,11,12,13 | 100 |

### Full `data.sql`

```sql
-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (id, email, password_hash, is_admin, created_at) VALUES
  (RANDOM_UUID(), 'admin@mystreet.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
   TRUE, CURRENT_TIMESTAMP),
  (RANDOM_UUID(), 'john.doe@example.com',
   '$2a$10$TwSHmcBDfVxNxgVNDAkO1ePbYtT6RqgTFbXDX5W2nXOiAILWaKB5S',
   FALSE, CURRENT_TIMESTAMP),
  (RANDOM_UUID(), 'sara.james@example.com',
   '$2a$10$TwSHmcBDfVxNxgVNDAkO1ePbYtT6RqgTFbXDX5W2nXOiAILWaKB5S',
   FALSE, CURRENT_TIMESTAMP);

-- ============================================================
-- PRODUCTS
-- ============================================================

-- Nike
INSERT INTO product (id, name, brand, description, price, image_url, sizes_csv, stock_qty, created_at) VALUES
(
  RANDOM_UUID(),
  'Air Max 90',
  'Nike',
  'A timeless icon since 1990. The Air Max 90 stays true to its OG roots with a waffle outsole, stitched overlays, and Max Air cushioning in the heel. Designed for all-day comfort with undeniable retro style.',
  119.99,
  'https://picsum.photos/seed/airmax90/600/400',
  '6,7,8,9,10,11,12',
  60,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'Air Force 1 Low',
  'Nike',
  'From the hardwood to the streets, the Air Force 1 Low revolutionized basketball footwear in 1982. A perforated toe box, leather upper, and full-length Air sole keep every step fresh and cushioned.',
  109.99,
  'https://picsum.photos/seed/af1low/600/400',
  '6,7,8,9,10,11,12,13',
  80,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'React Infinity Run Flyknit 3',
  'Nike',
  'Built to help keep you running, the React Infinity Run 3 features a wider base and more foam underfoot than ever before. React technology absorbs impact and returns energy, mile after mile.',
  159.99,
  'https://picsum.photos/seed/reactinfinity/600/400',
  '7,8,9,10,11,12',
  40,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'Dunk Low Retro',
  'Nike',
  'Originally released as a basketball shoe in 1985, the Dunk Low has transcended sport to become a streetwear staple. Padded, low-cut collar and rubber outsole for traction on and off the court.',
  114.99,
  'https://picsum.photos/seed/dunklow/600/400',
  '5,6,7,8,9,10,11,12',
  35,
  CURRENT_TIMESTAMP
);

-- Adidas
INSERT INTO product (id, name, brand, description, price, image_url, sizes_csv, stock_qty, created_at) VALUES
(
  RANDOM_UUID(),
  'Ultraboost 22',
  'Adidas',
  'The Ultraboost 22 is engineered for high-mileage runners who refuse to compromise on comfort. A responsive BOOST midsole, a PRIMEKNIT+ upper that wraps the foot like a second skin, and a Continental rubber outsole deliver elite performance.',
  189.99,
  'https://picsum.photos/seed/ultraboost22/600/400',
  '6,7,8,9,10,11,12',
  45,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'Stan Smith',
  'Adidas',
  'Simple. Clean. Iconic. The Stan Smith has defined understated cool since 1971. A smooth leather upper, minimal branding, and a perforated 3-Stripes panel keep this tennis-court legend as relevant as ever.',
  89.99,
  'https://picsum.photos/seed/stansmith/600/400',
  '5,6,7,8,9,10,11,12',
  70,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'NMD_R1',
  'Adidas',
  'Born from running archives, refined for the city. The NMD_R1 features a Primeknit upper for a sock-like fit, BOOST cushioning for all-day comfort, and EVA midsole plugs as a nod to its heritage.',
  139.99,
  'https://picsum.photos/seed/nmdr1/600/400',
  '6,7,8,9,10,11',
  30,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'Gazelle Bold',
  'Adidas',
  'The Gazelle gets a platform update without losing its retro soul. A suede upper, T-toe overlay, and chunky cupsole give this lifestyle icon a fresh height boost while honoring decades of heritage.',
  109.99,
  'https://picsum.photos/seed/gazelle/600/400',
  '5,6,7,8,9,10,11',
  25,
  CURRENT_TIMESTAMP
);

-- New Balance
INSERT INTO product (id, name, brand, description, price, image_url, sizes_csv, stock_qty, created_at) VALUES
(
  RANDOM_UUID(),
  '990v5 Made in USA',
  'New Balance',
  'The 990v5 represents New Balance''s commitment to domestic craftsmanship. Handcrafted in Massachusetts, it combines a breathable mesh and pigskin suede upper with dual-density collar foam and an ENCAP midsole for the ultimate in comfort and durability.',
  184.99,
  'https://picsum.photos/seed/nb990v5/600/400',
  '7,8,9,10,11,12,13',
  20,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  '574 Core',
  'New Balance',
  'The 574 has been a New Balance staple since 1988. An ENCAP midsole provides lightweight support, a suede and mesh upper delivers everyday comfort, and a durable rubber outsole keeps you grounded wherever the day takes you.',
  79.99,
  'https://picsum.photos/seed/nb574/600/400',
  '6,7,8,9,10,11,12',
  55,
  CURRENT_TIMESTAMP
);

-- Vans
INSERT INTO product (id, name, brand, description, price, image_url, sizes_csv, stock_qty, created_at) VALUES
(
  RANDOM_UUID(),
  'Old Skool',
  'Vans',
  'The Old Skool, first released in 1977, was Vans'' first shoe to feature the iconic side stripe. A low-top silhouette, durable suede and canvas upper, and waffle outsole make it a skate-ready classic loved by generations.',
  69.99,
  'https://picsum.photos/seed/vansoldskool/600/400',
  '4,5,6,7,8,9,10,11,12,13',
  90,
  CURRENT_TIMESTAMP
),
(
  RANDOM_UUID(),
  'Authentic Canvas',
  'Vans',
  'The original. The Authentic is the shoe that started it all for Vans in 1966. A canvas upper, metal eyelets, and a vulcanized waffle outsole—stripped back to the essentials and built to last.',
  59.99,
  'https://picsum.photos/seed/vansauthentic/600/400',
  '4,5,6,7,8,9,10,11,12,13',
  100,
  CURRENT_TIMESTAMP
);
```

---

## 9. Testing Strategy

### Backend Unit Tests (target ≥60% method coverage)

| Test Class | What to cover |
|---|---|
| `AuthServiceTest` | register (new email, duplicate email), login (valid, wrong password) |
| `ProductServiceTest` | list (no filter, brand filter, size filter), getById (found, not found), create, update, delete |
| `OrderServiceTest` | create order (success, stock decrement), get mine, get by id (owner vs non-owner) |
| `ProductRepositoryTest` | findByBrand, findBySizesContaining (JPA `@DataJpaTest` — H2 already in scope, no extra config) |

### API Testing
- Postman collection with environment variables for `baseUrl` and `token`
- Covers: auth flow, product CRUD (admin token), cart-to-order flow, error cases (404, 403, 400)

### Frontend Testing (optional, per rubric)
- `CartContext` reducer logic: add item, update quantity, remove item, clear cart

---

## 10. Non-Functional Checklist

- [ ] All passwords BCrypt-hashed; plain text never stored or logged
- [ ] JWT secret externalized to `application.yml` (not hardcoded in source)
- [ ] Server-side input validation on all POST/PUT request bodies
- [ ] CORS configured to allow only `http://localhost:5173` (Vite dev server)
- [ ] API response times <1s under normal dev load
- [ ] No critical ESLint errors on frontend build
- [ ] Console logging on backend for request/response (Spring default logs sufficient)
- [ ] Structured error JSON returned for all 4xx/5xx responses

---

## 11. AI Usage Log (for README)

Track every significant Copilot/ChatGPT prompt used during development. Example format:

```
| Area | Prompt Summary | Output Used |
|---|---|---|
| Backend | "Generate Spring Boot JPA entity for Product with UUID PK" | Adapted entity class |
| Frontend | "Generate React Context for cart with localStorage persistence" | Adapted CartContext |
| Tests | "Write JUnit 5 Mockito test for ProductService.create" | Used as base template |
```

---

## 12. Stretch Goals (if time permits)

- Pagination on product list (`?page=0&size=12`)
- Search bar filtering by product name
- Order history page listing all past orders with status
- Basic address input formatting

---

## 13. Getting Started (Quick Reference)

```bash
# Backend — no profile flag needed; H2 is the only database
cd backend
./mvnw spring-boot:run

# Frontend
cd frontend
npm install
npm run dev
```

| URL | Purpose |
|---|---|
| http://localhost:5173 | React UI |
| http://localhost:8080/api | REST API base |
| http://localhost:8080/swagger-ui.html | Swagger / OpenAPI docs |
| http://localhost:8080/h2-console | H2 browser console (JDBC URL: `jdbc:h2:mem:mystreetdb`) |

> **H2 console login:** JDBC URL `jdbc:h2:mem:mystreetdb`, User `sa`, Password *(empty)*.

---

## 14. Definition of Done (Project Level)

- [ ] All Sprint 1–3 backend and frontend tasks completed and merged to `main`
- [ ] Backend unit tests pass; JaCoCo report shows ≥60% method coverage
- [ ] Manual Postman tests pass for all documented endpoints
- [ ] Application runs end-to-end on localhost with seed data
- [ ] README.md complete with setup, seed, run, and AI usage sections
- [ ] Postman collection exported and committed to `postman/`
- [ ] No critical ESLint/TypeScript errors
- [ ] Peer code review completed on each PR before merge
