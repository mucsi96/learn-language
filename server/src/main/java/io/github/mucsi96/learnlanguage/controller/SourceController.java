package io.github.mucsi96.learnlanguage.controller;

import io.github.mucsi96.learnlanguage.service.SourceService;
import io.github.mucsi96.learnlanguage.service.DocumentProcessorService;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sources")
@RequiredArgsConstructor
public class SourceController {

    private final SourceService sourceService;
    private final DocumentProcessorService documentProcessorService;

    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    @GetMapping
    public List<SourceResponse> getSources() {
        return sourceService.getAllSources().stream().map(source -> SourceResponse.builder()
                .id(source.getId())
                .name(source.getName())
                .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
                .build()).collect(Collectors.toList());
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    @GetMapping("/{sourceId}/page/{pageNumber}")
    public PageResponse getPage(@PathVariable String sourceId, @PathVariable int pageNumber) {
        var source = sourceService.getSourceById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

        var result = documentProcessorService.processDocument("sources/" + source.getName(), pageNumber);
        var ids = result.getSpans().stream().map(span -> span.getId()).collect(Collectors.toList());
        var cards = sourceService.getCardsByIds(ids);

        result.setSpans(result.getSpans().stream().map(span -> {
            span.setExists(cards.stream().anyMatch(card -> card.getId().equals(span.getId())));
            return span;
        }).collect(Collectors.toList()));

        result.setNumber(pageNumber);
        result.setSourceId(sourceId);
        result.setSourceName(source.getName());

        source.setBookmarkedPage(pageNumber);
        sourceService.updateSource(source);

        return result;
    }
}
