-- ── Users ────────────────────────────────────────────────────────────────────
-- Passwords: Admin@123 and User@123 (BCrypt strength 10)
INSERT INTO users (id, email, password_hash, is_admin, created_at) VALUES
  (RANDOM_UUID(), 'admin@mystreet.com',      '$2a$10$CN.B7CG2q.sTRuhVGUB3eOLpyIkvF84K1eu56EvgbLFteo.ylF2be', TRUE,  NOW()),
  (RANDOM_UUID(), 'john.doe@example.com',    '$2a$10$GfxWEewvKxppl0Ue5Ah21OU5GR60N/DEOx7/ELjg7OKFcpckWt5dy', FALSE, NOW()),
  (RANDOM_UUID(), 'sara.james@example.com',  '$2a$10$GfxWEewvKxppl0Ue5Ah21OU5GR60N/DEOx7/ELjg7OKFcpckWt5dy', FALSE, NOW());

-- ── Products ─────────────────────────────────────────────────────────────────
-- Nike
INSERT INTO product (id, name, brand, description, price, image_url, sizes_csv, stock_qty, created_at) VALUES
  (RANDOM_UUID(), 'Air Max 90', 'Nike',
   'A timeless icon since 1990. The Air Max 90 stays true to its OG roots with a waffle outsole, stitched overlays, and Max Air cushioning in the heel. Designed for all-day comfort with undeniable retro style.',
   119.99, '/images/nike-air-max-90.jpg', '6,7,8,9,10,11,12', 60, NOW()),

  (RANDOM_UUID(), 'Air Force 1 Low', 'Nike',
   'From the hardwood to the streets, the Air Force 1 Low revolutionized basketball footwear in 1982. A perforated toe box, leather upper, and full-length Air sole keep every step fresh and cushioned.',
   109.99, '/images/nike-air-force-1.jpg', '6,7,8,9,10,11,12,13', 80, NOW()),

  (RANDOM_UUID(), 'React Infinity Run Flyknit 3', 'Nike',
   'Built to help keep you running, the React Infinity Run 3 features a wider base and more foam underfoot than ever before. React technology absorbs impact and returns energy, mile after mile.',
   159.99, '/images/nike-react-infinity.jpg', '7,8,9,10,11,12', 40, NOW()),

  (RANDOM_UUID(), 'Dunk Low Retro', 'Nike',
   'Originally released as a basketball shoe in 1985, the Dunk Low has transcended sport to become a streetwear staple. Padded, low-cut collar and rubber outsole for traction on and off the court.',
   114.99, '/images/nike-dunk-low.jpg', '5,6,7,8,9,10,11,12', 35, NOW()),

-- Adidas
  (RANDOM_UUID(), 'Ultraboost 22', 'Adidas',
   'The Ultraboost 22 is engineered for high-mileage runners who refuse to compromise on comfort. A responsive BOOST midsole, a PRIMEKNIT+ upper that wraps the foot like a second skin, and a Continental rubber outsole deliver elite performance.',
   189.99, '/images/adidas-ultraboost-22.jpg', '6,7,8,9,10,11,12', 45, NOW()),

  (RANDOM_UUID(), 'Stan Smith', 'Adidas',
   'Simple. Clean. Iconic. The Stan Smith has defined understated cool since 1971. A smooth leather upper, minimal branding, and a perforated 3-Stripes panel keep this tennis-court legend as relevant as ever.',
   89.99, '/images/adidas-stan-smith.jpg', '5,6,7,8,9,10,11,12', 70, NOW()),

  (RANDOM_UUID(), 'NMD_R1', 'Adidas',
   'Born from running archives, refined for the city. The NMD_R1 features a Primeknit upper for a sock-like fit, BOOST cushioning for all-day comfort, and EVA midsole plugs as a nod to its heritage.',
   139.99, '/images/adidas-nmd-r1.jpg', '6,7,8,9,10,11', 30, NOW()),

  (RANDOM_UUID(), 'Gazelle Bold', 'Adidas',
   'The Gazelle gets a platform update without losing its retro soul. A suede upper, T-toe overlay, and chunky cupsole give this lifestyle icon a fresh height boost while honoring decades of heritage.',
   109.99, '/images/adidas-gazelle.jpg', '5,6,7,8,9,10,11', 25, NOW()),

-- New Balance
  (RANDOM_UUID(), '990v5 Made in USA', 'New Balance',
   'The 990v5 represents New Balance''s commitment to domestic craftsmanship. Handcrafted in Massachusetts, it combines a breathable mesh and pigskin suede upper with dual-density collar foam and an ENCAP midsole.',
   184.99, '/images/nb-990v5.jpg', '7,8,9,10,11,12,13', 20, NOW()),

  (RANDOM_UUID(), '574 Core', 'New Balance',
   'The 574 has been a New Balance staple since 1988. An ENCAP midsole provides lightweight support, a suede and mesh upper delivers everyday comfort, and a durable rubber outsole keeps you grounded.',
   79.99, '/images/nb-574.jpg', '6,7,8,9,10,11,12', 55, NOW()),

-- Vans
  (RANDOM_UUID(), 'Old Skool', 'Vans',
   'The Old Skool, first released in 1977, was Vans'' first shoe to feature the iconic side stripe. A low-top silhouette, durable suede and canvas upper, and waffle outsole make it a skate-ready classic.',
   69.99, '/images/vans-old-skool.jpg', '4,5,6,7,8,9,10,11,12,13', 90, NOW()),

  (RANDOM_UUID(), 'Authentic Canvas', 'Vans',
   'The original. The Authentic is the shoe that started it all for Vans in 1966. A canvas upper, metal eyelets, and a vulcanized waffle outsole stripped back to the essentials and built to last.',
   59.99, '/images/vans-authentic.jpg', '4,5,6,7,8,9,10,11,12,13', 100, NOW());
