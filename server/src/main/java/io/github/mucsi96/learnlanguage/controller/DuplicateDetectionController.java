package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DuplicateDetectionRequest;
import io.github.mucsi96.learnlanguage.model.DuplicateDetectionResponse;
import io.github.mucsi96.learnlanguage.service.DuplicateDetectionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DuplicateDetectionController {

    private final DuplicateDetectionService duplicateDetectionService;

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PostMapping("/duplicate-detection")
    public DuplicateDetectionResponse detect(
            @RequestBody DuplicateDetectionRequest request,
            @RequestParam ChatModel model) {
        return duplicateDetectionService.detectDuplicates(request.getNewIds(), model);
    }
}
