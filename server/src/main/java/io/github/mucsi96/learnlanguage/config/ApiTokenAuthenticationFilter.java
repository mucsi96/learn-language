package io.github.mucsi96.learnlanguage.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class ApiTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final String DICTIONARY_PATH_PREFIX = "/api/dictionary";
    private static final String BEARER_PREFIX = "Bearer ";

    private final String apiToken;

    public ApiTokenAuthenticationFilter(@Value("${dictionary-api-token}") String apiToken) {
        this.apiToken = apiToken;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }

        final String token = authHeader.substring(BEARER_PREFIX.length());

        if (!apiToken.equals(token)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(DICTIONARY_PATH_PREFIX);
    }
}
