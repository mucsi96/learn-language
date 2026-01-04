package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.model.SourceRequest;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import io.github.mucsi96.learnlanguage.model.WordListResponse;
import io.github.mucsi96.learnlanguage.service.AreaWordsService;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.CardService.SourceCardCount;
import io.github.mucsi96.learnlanguage.service.DocumentProcessorService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.SourceService;
import io.github.mucsi96.learnlanguage.util.BeanUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import com.azure.core.util.BinaryData;

@RestController
@RequiredArgsConstructor
public class SourceController {

  private final SourceService sourceService;
  private final CardService cardService;
  private final DocumentProcessorService documentProcessorService;
  private final AreaWordsService areaWordsService;
  private final FileStorageService fileStorageService;

  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  @GetMapping("/sources")
  public List<SourceResponse> getSources() {
    var sources = sourceService.getAllSources();
    var cardCounts = cardService.getCardCountsBySource();

    return sources.stream().map(source -> {
      var cardCount = cardCounts.stream()
          .filter(count -> count.sourceId().equals(source.getId()))
          .findFirst()
          .map(SourceCardCount::count)
          .orElse(0);

      return SourceResponse.builder()
          .id(source.getId())
          .name(source.getName())
          .fileName(source.getFileName())
          .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
          .cardCount(cardCount)
          .languageLevel(source.getLanguageLevel())
          .formatType(source.getFormatType())
          .build();
    }).collect(Collectors.toList());
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @GetMapping("/source/{sourceId}/page/{pageNumber}")
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
  @GetMapping("/source/{sourceId}/page/{pageNumber}/words")
  public WordListResponse getWords(
      @PathVariable String sourceId,
      @PathVariable int pageNumber,
      @RequestParam Double x,
      @RequestParam Double y,
      @RequestParam Double width,
      @RequestParam Double height,
      @RequestParam ChatModel model) throws IOException {

    var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    byte[] imageData = documentProcessorService.getPageArea(source, pageNumber, x, y, width, height);

    var areaWords = areaWordsService.getAreaWords(imageData, model, source.getFormatType());
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

  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  @GetMapping("/sources/due-cards-count")
  public List<SourceDueCardCountResponse> getDueCardsCountBySource() {
    return cardService.getDueCardCountsBySource();
  }

  @PostMapping("/source")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> createSource(@RequestBody SourceRequest request) {
    Source source = Source.builder()
        .id(request.getId())
        .name(request.getName())
        .fileName(request.getFileName())
        .startPage(request.getStartPage())
        .languageLevel(request.getLanguageLevel())
        .cardType(request.getCardType())
        .formatType(request.getFormatType())
        .build();

    sourceService.saveSource(source);

    return ResponseEntity.ok(new HashMap<>());
  }

  @PutMapping("/source/{sourceId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> updateSource(
      @PathVariable String sourceId,
      @RequestBody SourceRequest request) {
    Source existingSource = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    Source updates = Source.builder()
        .name(request.getName())
        .fileName(request.getFileName())
        .startPage(request.getStartPage())
        .languageLevel(request.getLanguageLevel())
        .cardType(request.getCardType())
        .formatType(request.getFormatType())
        .build();

    BeanUtils.copyNonNullProperties(updates, existingSource);
    sourceService.saveSource(existingSource);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Source updated successfully");
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/source/{sourceId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteSource(@PathVariable String sourceId) {
    Source source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    sourceService.deleteSource(source);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Source deleted successfully");
    return ResponseEntity.ok(response);
  }

  @PostMapping("/source/upload")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> uploadSourceFile(@RequestParam("file") MultipartFile file) {
    try {
      // Validate file type
      String originalFilename = file.getOriginalFilename();
      if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Only PDF files are allowed");
        return ResponseEntity.badRequest().body(errorResponse);
      }

      BinaryData fileData = BinaryData.fromBytes(file.getBytes());
      fileStorageService.saveFile(fileData, "sources/" + originalFilename);

      Map<String, String> response = new HashMap<>();
      response.put("fileName", originalFilename);
      response.put("detail", "File uploaded successfully");
      return ResponseEntity.ok(response);
    } catch (IOException e) {
      Map<String, String> errorResponse = new HashMap<>();
      errorResponse.put("error", "Failed to upload file: " + e.getMessage());
      return ResponseEntity.internalServerError().body(errorResponse);
    }
  }
}
