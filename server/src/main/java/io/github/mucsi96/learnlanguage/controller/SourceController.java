package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import io.github.mucsi96.learnlanguage.model.WordListResponse;
import io.github.mucsi96.learnlanguage.service.AreaWordsService;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.DocumentProcessorService;
import io.github.mucsi96.learnlanguage.service.SourceService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SourceController {

  private final SourceService sourceService;
  private final CardService cardService;
  private final DocumentProcessorService documentProcessorService;
  private final AreaWordsService areaWordsService;

  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  @GetMapping("/api/sources")
  public List<SourceResponse> getSources() {
    return sourceService.getAllSources().stream().map(source -> SourceResponse.builder()
        .id(source.getId())
        .name(source.getName())
        .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
        .build()).collect(Collectors.toList());
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @GetMapping("/api/source/{sourceId}/page/{pageNumber}")
  public PageResponse getPage(@PathVariable String sourceId, @PathVariable int pageNumber) throws IOException {
    var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    var result = documentProcessorService.processDocument(source, pageNumber);
    var ids = result.getSpans().stream().map(span -> span.getId()).collect(Collectors.toList());
    var cards = cardService.getCardsByIds(ids);

    result.setSpans(result.getSpans().stream().map(span -> {
      span.setExists(cards.stream().anyMatch(card -> card.getId().equals(span.getId())));
      return span;
    }).collect(Collectors.toList()));

    result.setNumber(pageNumber);
    result.setSourceId(sourceId);
    result.setSourceName(source.getName());

    source.setBookmarkedPage(pageNumber);
    sourceService.saveSource(source);

    return result;
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @GetMapping("/api/source/{sourceId}/page/{pageNumber}/words")
  public WordListResponse getWords(
      @PathVariable String sourceId,
      @PathVariable int pageNumber,
      @RequestParam Double x,
      @RequestParam Double y,
      @RequestParam Double width,
      @RequestParam Double height) throws IOException {

    var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    byte[] imageData = documentProcessorService.getPageArea(source, pageNumber, x, y, width, height);

    var areaWords = areaWordsService.getAreaWords(imageData);
    List<String> ids = areaWords.stream()
        .map(word -> word.getId())
        .toList();

    var cards = cardService.getCardsByIds(ids);

    var words = areaWords.stream().map(word -> {
      word.setExists(cards.stream().anyMatch(card -> card.getId().equals(word.getId())));
      return word;
    }).collect(Collectors.toList());

    return WordListResponse.builder()
        .words(words)
        .x(x)
        .y(y)
        .width(width)
        .height(height)
        .build();
  }
}
