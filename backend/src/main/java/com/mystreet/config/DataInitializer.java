package com.mystreet.config;

import com.mystreet.entity.Product;
import com.mystreet.entity.User;
import com.mystreet.repository.ProductRepository;
import com.mystreet.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           ProductRepository productRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return; // skip if already seeded

        // ── Users ────────────────────────────────────────────────────────────
        User admin = new User();
        admin.setEmail("admin@mystreet.com");
        admin.setPasswordHash(passwordEncoder.encode("Admin@123"));
        admin.setAdmin(true);
        userRepository.save(admin);

        User john = new User();
        john.setEmail("john.doe@example.com");
        john.setPasswordHash(passwordEncoder.encode("User@123"));
        userRepository.save(john);

        User sara = new User();
        sara.setEmail("sara.james@example.com");
        sara.setPasswordHash(passwordEncoder.encode("User@123"));
        userRepository.save(sara);

        // ── Products ─────────────────────────────────────────────────────────
        // Nike
        saveProduct("Air Max 90", "Nike",
            "A timeless icon since 1990. The Air Max 90 stays true to its OG roots with a waffle outsole, stitched overlays, and Max Air cushioning in the heel. Designed for all-day comfort with undeniable retro style.",
            "119.99", "/images/nike-air-max-90.jpg", "6,7,8,9,10,11,12", 60);

        saveProduct("Air Force 1 Low", "Nike",
            "From the hardwood to the streets, the Air Force 1 Low revolutionized basketball footwear in 1982. A perforated toe box, leather upper, and full-length Air sole keep every step fresh and cushioned.",
            "109.99", "/images/nike-air-force-1.jpg", "6,7,8,9,10,11,12,13", 80);

        saveProduct("React Infinity Run Flyknit 3", "Nike",
            "Built to help keep you running, the React Infinity Run 3 features a wider base and more foam underfoot than ever before. React technology absorbs impact and returns energy, mile after mile.",
            "159.99", "/images/nike-react-infinity.jpg", "7,8,9,10,11,12", 40);

        saveProduct("Dunk Low Retro", "Nike",
            "Originally released as a basketball shoe in 1985, the Dunk Low has transcended sport to become a streetwear staple. Padded, low-cut collar and rubber outsole for traction on and off the court.",
            "114.99", "/images/nike-dunk-low.jpg", "5,6,7,8,9,10,11,12", 35);

        // Adidas
        saveProduct("Ultraboost 22", "Adidas",
            "The Ultraboost 22 is engineered for high-mileage runners who refuse to compromise on comfort. A responsive BOOST midsole, a PRIMEKNIT+ upper that wraps the foot like a second skin, and a Continental rubber outsole deliver elite performance.",
            "189.99", "/images/adidas-ultraboost-22.jpg", "6,7,8,9,10,11,12", 45);

        saveProduct("Stan Smith", "Adidas",
            "Simple. Clean. Iconic. The Stan Smith has defined understated cool since 1971. A smooth leather upper, minimal branding, and a perforated 3-Stripes panel keep this tennis-court legend as relevant as ever.",
            "89.99", "/images/adidas-stan-smith.jpg", "5,6,7,8,9,10,11,12", 70);

        saveProduct("NMD_R1", "Adidas",
            "Born from running archives, refined for the city. The NMD_R1 features a Primeknit upper for a sock-like fit, BOOST cushioning for all-day comfort, and EVA midsole plugs as a nod to its heritage.",
            "139.99", "/images/adidas-nmd-r1.jpg", "6,7,8,9,10,11", 30);

        saveProduct("Gazelle Bold", "Adidas",
            "The Gazelle gets a platform update without losing its retro soul. A suede upper, T-toe overlay, and chunky cupsole give this lifestyle icon a fresh height boost while honoring decades of heritage.",
            "109.99", "/images/adidas-gazelle.jpg", "5,6,7,8,9,10,11", 25);

        // New Balance
        saveProduct("990v5 Made in USA", "New Balance",
            "The 990v5 represents New Balance's commitment to domestic craftsmanship. Handcrafted in Massachusetts, it combines a breathable mesh and pigskin suede upper with dual-density collar foam and an ENCAP midsole.",
            "184.99", "/images/nb-990v5.jpg", "7,8,9,10,11,12,13", 20);

        saveProduct("574 Core", "New Balance",
            "The 574 has been a New Balance staple since 1988. An ENCAP midsole provides lightweight support, a suede and mesh upper delivers everyday comfort, and a durable rubber outsole keeps you grounded.",
            "79.99", "/images/nb-574.jpg", "6,7,8,9,10,11,12", 55);

        // Vans
        saveProduct("Old Skool", "Vans",
            "The Old Skool, first released in 1977, was Vans' first shoe to feature the iconic side stripe. A low-top silhouette, durable suede and canvas upper, and waffle outsole make it a skate-ready classic.",
            "69.99", "/images/vans-old-skool.jpg", "4,5,6,7,8,9,10,11,12,13", 90);

        saveProduct("Authentic Canvas", "Vans",
            "The original. The Authentic is the shoe that started it all for Vans in 1966. A canvas upper, metal eyelets, and a vulcanized waffle outsole—stripped back to the essentials and built to last.",
            "59.99", "/images/vans-authentic.jpg", "4,5,6,7,8,9,10,11,12,13", 100);
    }

    private void saveProduct(String name, String brand, String description,
                             String price, String imageUrl, String sizesCsv, int stockQty) {
        Product p = new Product();
        p.setName(name);
        p.setBrand(brand);
        p.setDescription(description);
        p.setPrice(new BigDecimal(price));
        p.setImageUrl(imageUrl);
        p.setSizesCsv(sizesCsv);
        p.setStockQty(stockQty);
        productRepository.save(p);
    }
}
