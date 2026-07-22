package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ApiTokenScope;
import io.github.mucsi96.learnlanguage.model.KnownCardsExportResponse;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import io.github.mucsi96.learnlanguage.service.KnownWordService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class KnownCardsExportController {

    private final ApiTokenService apiTokenService;
    private final KnownWordService knownWordService;

    @GetMapping("/known-cards")
    public KnownCardsExportResponse exportKnownCards(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(name = "groupId", required = false) List<String> groupIds) {
        apiTokenService.validateBearerToken(authorizationHeader, ApiTokenScope.KNOWN_CARDS_EXPORT);
        return KnownCardsExportResponse.builder()
                .words(knownWordService.getExportWords(groupIds))
                .build();
    }
}
