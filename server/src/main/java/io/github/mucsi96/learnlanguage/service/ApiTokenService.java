package io.github.mucsi96.learnlanguage.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.ApiToken;
import io.github.mucsi96.learnlanguage.model.ApiTokenCreateResponse;
import io.github.mucsi96.learnlanguage.model.ApiTokenRequest;
import io.github.mucsi96.learnlanguage.model.ApiTokenResponse;
import io.github.mucsi96.learnlanguage.repository.ApiTokenRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApiTokenService {

    private static final int TOKEN_BYTE_LENGTH = 48;

    private final ApiTokenRepository apiTokenRepository;

    public List<ApiTokenResponse> getAllTokens() {
        return apiTokenRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public ApiTokenCreateResponse createToken(ApiTokenRequest request) {
        final String token = generateSecureToken();
        final ApiToken entity = ApiToken.builder()
                .name(request.getName())
                .token(token)
                .createdAt(LocalDateTime.now())
                .build();

        final ApiToken saved = apiTokenRepository.save(entity);

        return ApiTokenCreateResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .token(token)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    public void deleteToken(Integer id) {
        apiTokenRepository.deleteById(id);
    }

    public void validateBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        final String token = authorizationHeader.substring(7);

        if (!apiTokenRepository.existsByToken(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid API token");
        }
    }

    private String generateSecureToken() {
        final byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ApiTokenResponse toResponse(ApiToken entity) {
        return ApiTokenResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
