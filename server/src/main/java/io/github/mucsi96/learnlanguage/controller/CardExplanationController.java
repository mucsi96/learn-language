package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.github.mucsi96.learnlanguage.model.CardExplanationRequest;
import io.github.mucsi96.learnlanguage.model.CardExplanationResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.TranscriptionResponse;
import io.github.mucsi96.learnlanguage.service.CardExplanationService;
import io.github.mucsi96.learnlanguage.service.TranscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class CardExplanationController {

    private final CardExplanationService cardExplanationService;
    private final TranscriptionService transcriptionService;

    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    @PostMapping("/card/{cardId}/explain")
    public CardExplanationResponse explain(
            @PathVariable String cardId,
            @Valid @RequestBody CardExplanationRequest request,
            @RequestParam ChatModel model) {

        final String answer = cardExplanationService.explain(cardId, request.getMessages(), model);

        return CardExplanationResponse.builder()
                .answer(answer)
                .build();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TranscriptionResponse transcribe(@RequestParam("file") MultipartFile file) throws IOException {
        final String text = transcriptionService.transcribe(file.getBytes(), file.getOriginalFilename());

        return TranscriptionResponse.builder()
                .text(text)
                .build();
    }
}
