package com.mystreet.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class OrderItemRequest {
    @NotNull(message = "Product ID is required")
    private UUID productId;

    @NotBlank(message = "Size is required")
    private String size;

    @Min(value = 1, message = "Quantity must be at least 1")
    private int quantity;

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
}
