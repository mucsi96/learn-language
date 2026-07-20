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

import io.github.mucsi96.learnlanguage.model.SourceGroupRequest;
import io.github.mucsi96.learnlanguage.model.SourceGroupResponse;
import io.github.mucsi96.learnlanguage.service.SourceGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/source-groups")
@RequiredArgsConstructor
public class SourceGroupController {

    private final SourceGroupService sourceGroupService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public List<SourceGroupResponse> getAllSourceGroups() {
        return sourceGroupService.getAllSourceGroups();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public SourceGroupResponse createSourceGroup(
            @Valid @RequestBody SourceGroupRequest request) {
        return sourceGroupService.createSourceGroup(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public SourceGroupResponse updateSourceGroup(
            @PathVariable String id,
            @Valid @RequestBody SourceGroupRequest request) {
        return sourceGroupService.updateSourceGroup(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteSourceGroup(@PathVariable String id) {
        sourceGroupService.deleteSourceGroup(id);
        return ResponseEntity.noContent().build();
    }
}
