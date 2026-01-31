package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.LearningPartnerRequest;
import io.github.mucsi96.learnlanguage.model.LearningPartnerResponse;
import io.github.mucsi96.learnlanguage.service.LearningPartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/learning-partners")
@RequiredArgsConstructor
public class LearningPartnerController {

    private final LearningPartnerService learningPartnerService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public List<LearningPartnerResponse> getAllLearningPartners() {
        return learningPartnerService.getAllLearningPartners();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public LearningPartnerResponse createLearningPartner(
            @Valid @RequestBody LearningPartnerRequest request) {
        return learningPartnerService.createLearningPartner(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public LearningPartnerResponse updateLearningPartner(
            @PathVariable Integer id,
            @Valid @RequestBody LearningPartnerRequest request) {
        return learningPartnerService.updateLearningPartner(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteLearningPartner(@PathVariable Integer id) {
        learningPartnerService.deleteLearningPartner(id);
        return ResponseEntity.noContent().build();
    }
}
