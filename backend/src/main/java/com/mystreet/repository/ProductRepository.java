package com.mystreet.repository;

import com.mystreet.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByBrandIgnoreCase(String brand);
    List<Product> findBySizesCsvContaining(String size);
    List<Product> findByBrandIgnoreCaseAndSizesCsvContaining(String brand, String size);
}
