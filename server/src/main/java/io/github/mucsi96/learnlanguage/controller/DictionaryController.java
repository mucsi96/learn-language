package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;

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
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
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

        dictionaryService.streamLookup(request).subscribe(
                chunk -> {
                    try {
                        emitter.send(SseEmitter.event().data(chunk));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                },
                error -> {
                    log.error("Streaming error: {}", error.getMessage());
                    emitter.completeWithError(error);
                },
                emitter::complete);

        return emitter;
    }
}
