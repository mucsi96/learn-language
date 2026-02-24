package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import io.github.mucsi96.learnlanguage.service.DictionaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DictionaryController {

    private final ApiTokenService apiTokenService;
    private final DictionaryService dictionaryService;

    @PostMapping(value = "/dictionary", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter translate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody DictionaryRequest request) {
        apiTokenService.validateBearerToken(authorizationHeader);
        dictionaryService.persistHighlightIfPresent(request);

        final SseEmitter emitter = new SseEmitter(120_000L);
        dictionaryService.streamLookup(request, emitter);
        return emitter;
    }
}
