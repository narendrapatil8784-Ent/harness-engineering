package com.mystreet.dto;

import com.mystreet.entity.Order;
import com.mystreet.entity.OrderStatus;
import com.mystreet.entity.PaymentMode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class OrderResponse {
    private UUID id;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private PaymentMode paymentMode;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    public static OrderResponse from(Order order) {
        OrderResponse r = new OrderResponse();
        r.id = order.getId();
        r.status = order.getStatus();
        r.totalAmount = order.getTotalAmount();
        r.shippingAddress = order.getShippingAddress();
        r.paymentMode = order.getPaymentMode();
        r.createdAt = order.getCreatedAt();
        r.items = order.getItems().stream()
                .map(OrderItemResponse::from)
                .collect(Collectors.toList());
        return r;
    }

    public UUID getId() { return id; }
    public OrderStatus getStatus() { return status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getShippingAddress() { return shippingAddress; }
    public PaymentMode getPaymentMode() { return paymentMode; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<OrderItemResponse> getItems() { return items; }
}
