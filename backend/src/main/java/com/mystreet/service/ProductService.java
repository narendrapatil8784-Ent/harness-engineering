package com.mystreet.service;

import com.mystreet.dto.ProductRequest;
import com.mystreet.dto.ProductResponse;
import com.mystreet.entity.Product;
import com.mystreet.entity.User;
import com.mystreet.exception.ForbiddenException;
import com.mystreet.exception.ResourceNotFoundException;
import com.mystreet.repository.ProductRepository;
import com.mystreet.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ProductService(ProductRepository productRepository, UserRepository userRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public List<ProductResponse> listProducts(String brand, String size) {
        List<Product> products;
        boolean hasBrand = brand != null && !brand.isBlank();
        boolean hasSize = size != null && !size.isBlank();

        if (hasBrand && hasSize) {
            products = productRepository.findByBrandIgnoreCaseAndSizesCsvContaining(brand, size);
        } else if (hasBrand) {
            products = productRepository.findByBrandIgnoreCase(brand);
        } else if (hasSize) {
            products = productRepository.findBySizesCsvContaining(size);
        } else {
            products = productRepository.findAll();
        }

        return products.stream().map(ProductResponse::from).collect(Collectors.toList());
    }

    public ProductResponse getById(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        return ProductResponse.from(product);
    }

    public ProductResponse create(ProductRequest req) {
        assertAdmin();
        Product product = mapToEntity(req, new Product());
        return ProductResponse.from(productRepository.save(product));
    }

    public ProductResponse update(UUID id, ProductRequest req) {
        assertAdmin();
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        mapToEntity(req, product);
        return ProductResponse.from(productRepository.save(product));
    }

    public void delete(UUID id) {
        assertAdmin();
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        productRepository.delete(product);
    }

    private Product mapToEntity(ProductRequest req, Product product) {
        product.setName(req.getName());
        product.setBrand(req.getBrand());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setImageUrl(req.getImageUrl());
        product.setSizesCsv(req.getSizesCsv());
        product.setStockQty(req.getStockQty());
        return product;
    }

    private void assertAdmin() {
        User caller = currentUser();
        if (!caller.isAdmin()) {
            throw new ForbiddenException("Admin access required");
        }
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
