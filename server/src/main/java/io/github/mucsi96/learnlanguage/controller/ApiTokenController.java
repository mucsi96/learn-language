package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ApiTokenCreateResponse;
import io.github.mucsi96.learnlanguage.model.ApiTokenRequest;
import io.github.mucsi96.learnlanguage.model.ApiTokenResponse;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api-tokens")
@RequiredArgsConstructor
public class ApiTokenController {

    private final ApiTokenService apiTokenService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<ApiTokenResponse> getAllTokens() {
        return apiTokenService.getAllTokens();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ApiTokenCreateResponse createToken(@Valid @RequestBody ApiTokenRequest request) {
        return apiTokenService.createToken(request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteToken(@PathVariable Integer id) {
        apiTokenService.deleteToken(id);
        return ResponseEntity.noContent().build();
    }
}
