package com.mystreet.repository;

import com.mystreet.entity.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ProductRepositoryTest {

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();

        Product nike1 = new Product();
        nike1.setName("Air Max 90");
        nike1.setBrand("Nike");
        nike1.setPrice(new BigDecimal("119.99"));
        nike1.setSizesCsv("7,8,9,10,11");
        nike1.setStockQty(50);
        productRepository.save(nike1);

        Product nike2 = new Product();
        nike2.setName("Dunk Low");
        nike2.setBrand("Nike");
        nike2.setPrice(new BigDecimal("114.99"));
        nike2.setSizesCsv("8,9,10,11,12");
        nike2.setStockQty(30);
        productRepository.save(nike2);

        Product adidas = new Product();
        adidas.setName("Stan Smith");
        adidas.setBrand("Adidas");
        adidas.setPrice(new BigDecimal("89.99"));
        adidas.setSizesCsv("6,7,8,9,10");
        adidas.setStockQty(60);
        productRepository.save(adidas);
    }

    @Test
    void findByBrandIgnoreCase_returnsMatchingProducts() {
        List<Product> results = productRepository.findByBrandIgnoreCase("nike");
        assertThat(results).hasSize(2);
        assertThat(results).allMatch(p -> p.getBrand().equalsIgnoreCase("nike"));
    }

    @Test
    void findByBrandIgnoreCase_caseInsensitive() {
        List<Product> results = productRepository.findByBrandIgnoreCase("ADIDAS");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Stan Smith");
    }

    @Test
    void findBySizesCsvContaining_returnsMatchingProducts() {
        List<Product> results = productRepository.findBySizesCsvContaining("12");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Dunk Low");
    }

    @Test
    void findBySizesCsvContaining_multipleMatches() {
        List<Product> results = productRepository.findBySizesCsvContaining("9");
        assertThat(results).hasSize(3); // all have size 9
    }

    @Test
    void findByBrandIgnoreCaseAndSizesCsvContaining_filtersCorrectly() {
        List<Product> results = productRepository.findByBrandIgnoreCaseAndSizesCsvContaining("Nike", "12");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Dunk Low");
    }
}
