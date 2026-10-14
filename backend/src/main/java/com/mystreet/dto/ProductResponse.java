package com.mystreet.dto;

import com.mystreet.entity.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class ProductResponse {
    private UUID id;
    private String name;
    private String brand;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private String sizesCsv;
    private int stockQty;
    private LocalDateTime createdAt;

    public static ProductResponse from(Product p) {
        ProductResponse r = new ProductResponse();
        r.id = p.getId();
        r.name = p.getName();
        r.brand = p.getBrand();
        r.description = p.getDescription();
        r.price = p.getPrice();
        r.imageUrl = p.getImageUrl();
        r.sizesCsv = p.getSizesCsv();
        r.stockQty = p.getStockQty();
        r.createdAt = p.getCreatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getBrand() { return brand; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public String getImageUrl() { return imageUrl; }
    public String getSizesCsv() { return sizesCsv; }
    public int getStockQty() { return stockQty; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
