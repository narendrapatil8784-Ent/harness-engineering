package com.mystreet.dto;

public class ErrorResponse {
    private String timestamp;
    private String path;
    private String error;
    private String message;

    public ErrorResponse(String timestamp, String path, String error, String message) {
        this.timestamp = timestamp;
        this.path = path;
        this.error = error;
        this.message = message;
    }

    public String getTimestamp() { return timestamp; }
    public String getPath() { return path; }
    public String getError() { return error; }
    public String getMessage() { return message; }
}
