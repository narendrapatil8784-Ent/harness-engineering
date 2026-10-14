package com.mystreet.service;

import com.mystreet.dto.OrderItemRequest;
import com.mystreet.dto.OrderRequest;
import com.mystreet.dto.OrderResponse;
import com.mystreet.entity.*;
import com.mystreet.exception.ForbiddenException;
import com.mystreet.exception.ResourceNotFoundException;
import com.mystreet.repository.OrderRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private OrderService orderService;

    private User testUser;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("user@test.com");

        testProduct = new Product();
        testProduct.setId(UUID.randomUUID());
        testProduct.setName("Air Max 90");
        testProduct.setPrice(new BigDecimal("119.99"));
        testProduct.setStockQty(10);
    }

    private void mockSecurityContext(String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        SecurityContext sc = mock(SecurityContext.class);
        when(sc.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(sc);
    }

    @Test
    void createOrder_success_decrementsStock() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        when(productRepository.findById(testProduct.getId())).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(testProduct.getId());
        itemReq.setSize("9");
        itemReq.setQuantity(2);

        OrderRequest req = new OrderRequest();
        req.setItems(List.of(itemReq));
        req.setShippingAddress("123 Main St");
        req.setPaymentMode(PaymentMode.CASH_ON_DELIVERY);

        OrderResponse response = orderService.createOrder(req);

        assertThat(response).isNotNull();
        assertThat(testProduct.getStockQty()).isEqualTo(8); // decremented by 2
        verify(productRepository).save(testProduct);
    }

    @Test
    void createOrder_insufficientStock_throws() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));
        testProduct.setStockQty(1);
        when(productRepository.findById(testProduct.getId())).thenReturn(Optional.of(testProduct));

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(testProduct.getId());
        itemReq.setSize("9");
        itemReq.setQuantity(5);

        OrderRequest req = new OrderRequest();
        req.setItems(List.of(itemReq));
        req.setShippingAddress("123 Main St");
        req.setPaymentMode(PaymentMode.CASH_ON_DELIVERY);

        assertThatThrownBy(() -> orderService.createOrder(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Insufficient stock");
    }

    @Test
    void getMyOrders_returnsUserOrders() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setUser(testUser);
        order.setShippingAddress("123 Main St");
        order.setPaymentMode(PaymentMode.MOCK_UPI);
        order.setTotalAmount(new BigDecimal("119.99"));
        order.setItems(new ArrayList<>());

        when(orderRepository.findByUserId(testUser.getId())).thenReturn(List.of(order));

        List<OrderResponse> result = orderService.getMyOrders();
        assertThat(result).hasSize(1);
    }

    @Test
    void getOrderById_owner_success() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setUser(testUser);
        order.setShippingAddress("123 Main St");
        order.setPaymentMode(PaymentMode.CASH_ON_DELIVERY);
        order.setTotalAmount(new BigDecimal("119.99"));
        order.setItems(new ArrayList<>());

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderById(order.getId());
        assertThat(response).isNotNull();
    }

    @Test
    void getOrderById_nonOwner_throws403() {
        mockSecurityContext("user@test.com");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(testUser));

        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setEmail("other@test.com");

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setUser(otherUser);
        order.setItems(new ArrayList<>());

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.getOrderById(order.getId()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Access denied");
    }
}
