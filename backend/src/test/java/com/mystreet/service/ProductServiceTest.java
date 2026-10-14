package com.mystreet.service;

import com.mystreet.dto.ProductRequest;
import com.mystreet.dto.ProductResponse;
import com.mystreet.entity.Product;
import com.mystreet.entity.User;
import com.mystreet.exception.ForbiddenException;
import com.mystreet.exception.ResourceNotFoundException;
import com.mystreet.repository.ProductRepository;
import com.mystreet.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProductService productService;

    private User adminUser;
    private User regularUser;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin@test.com");
        adminUser.setAdmin(true);

        regularUser = new User();
        regularUser.setId(UUID.randomUUID());
        regularUser.setEmail("user@test.com");
        regularUser.setAdmin(false);
    }

    private void mockSecurityContext(String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        SecurityContext sc = mock(SecurityContext.class);
        when(sc.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(sc);
    }

    private Product sampleProduct() {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setName("Air Max 90");
        p.setBrand("Nike");
        p.setPrice(new BigDecimal("119.99"));
        p.setSizesCsv("8,9,10");
        p.setStockQty(10);
        return p;
    }

    @Test
    void listProducts_noFilter() {
        when(productRepository.findAll()).thenReturn(List.of(sampleProduct()));
        List<ProductResponse> result = productService.listProducts(null, null);
        assertThat(result).hasSize(1);
        verify(productRepository).findAll();
    }

    @Test
    void listProducts_brandFilter() {
        when(productRepository.findByBrandIgnoreCase("Nike")).thenReturn(List.of(sampleProduct()));
        List<ProductResponse> result = productService.listProducts("Nike", null);
        assertThat(result).hasSize(1);
        verify(productRepository).findByBrandIgnoreCase("Nike");
    }

    @Test
    void listProducts_sizeFilter() {
        when(productRepository.findBySizesCsvContaining("9")).thenReturn(List.of(sampleProduct()));
        List<ProductResponse> result = productService.listProducts(null, "9");
        assertThat(result).hasSize(1);
        verify(productRepository).findBySizesCsvContaining("9");
    }

    @Test
    void listProducts_brandAndSizeFilter() {
        when(productRepository.findByBrandIgnoreCaseAndSizesCsvContaining("Nike", "9"))
                .thenReturn(List.of(sampleProduct()));
        List<ProductResponse> result = productService.listProducts("Nike", "9");
        assertThat(result).hasSize(1);
    }

    @Test
    void getById_found() {
        Product p = sampleProduct();
        when(productRepository.findById(p.getId())).thenReturn(Optional.of(p));
        ProductResponse response = productService.getById(p.getId());
        assertThat(response.getName()).isEqualTo("Air Max 90");
    }

    @Test
    void getById_notFound_throws() {
        UUID id = UUID.randomUUID();
        when(productRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> productService.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_asAdmin_success() {
        mockSecurityContext("admin@test.com");
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(productRepository.save(any())).thenAnswer(inv -> {
            Product p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        ProductRequest req = new ProductRequest();
        req.setName("New Shoe");
        req.setBrand("Nike");
        req.setPrice(new BigDecimal("99.99"));
        req.setStockQty(10);

        ProductResponse response = productService.create(req);
        assertThat(response.getName()).isEqualTo("New Shoe");
    }

    @Test
    void create_asNonAdmin_throws403() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(regularUser));

        ProductRequest req = new ProductRequest();
        req.setName("New Shoe");
        req.setBrand("Nike");
        req.setPrice(new BigDecimal("99.99"));

        assertThatThrownBy(() -> productService.create(req))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Admin access required");
    }

    @Test
    void update_success() {
        mockSecurityContext("admin@test.com");
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        Product existing = sampleProduct();
        when(productRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(productRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ProductRequest req = new ProductRequest();
        req.setName("Updated Shoe");
        req.setBrand("Nike");
        req.setPrice(new BigDecimal("129.99"));
        req.setStockQty(5);

        ProductResponse response = productService.update(existing.getId(), req);
        assertThat(response.getName()).isEqualTo("Updated Shoe");
    }

    @Test
    void delete_success() {
        mockSecurityContext("admin@test.com");
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        Product existing = sampleProduct();
        when(productRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        productService.delete(existing.getId());
        verify(productRepository).delete(existing);
    }
}
