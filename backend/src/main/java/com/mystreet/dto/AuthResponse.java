package com.mystreet.dto;

public class AuthResponse {
    private String token;
    private String email;
    private boolean isAdmin;

    public AuthResponse() {}

    public AuthResponse(String token, String email, boolean isAdmin) {
        this.token = token;
        this.email = email;
        this.isAdmin = isAdmin;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public boolean isAdmin() { return isAdmin; }
}
