package com.mystreet.dto;

import com.mystreet.entity.OrderItem;

import java.math.BigDecimal;

public class OrderItemResponse {
    private String productName;
    private String size;
    private int quantity;
    private BigDecimal unitPrice;

    public static OrderItemResponse from(OrderItem item) {
        OrderItemResponse r = new OrderItemResponse();
        r.productName = item.getProductName();
        r.size = item.getSize();
        r.quantity = item.getQuantity();
        r.unitPrice = item.getUnitPrice();
        return r;
    }

    public String getProductName() { return productName; }
    public String getSize() { return size; }
    public int getQuantity() { return quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
}
