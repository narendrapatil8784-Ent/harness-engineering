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
