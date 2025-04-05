package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.service.SourceService;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sources")
public class SourceController {

    @Autowired
    private SourceService sourceService;

    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    @GetMapping
    public List<SourceResponse> getSources() {
        return sourceService.getAllSources().stream().map(source -> SourceResponse.builder()
                .id(source.getId())
                .name(source.getName())
                .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
                .build()).collect(Collectors.toList());
    }
}
