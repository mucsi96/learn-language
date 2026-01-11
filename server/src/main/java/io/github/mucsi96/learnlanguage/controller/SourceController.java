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

import io.github.mucsi96.learnlanguage.entity.Document;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.model.SourceRequest;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.WordListResponse;
import io.github.mucsi96.learnlanguage.repository.DocumentRepository;
import io.github.mucsi96.learnlanguage.service.AreaWordsService;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.CardService.SourceCardCount;
import io.github.mucsi96.learnlanguage.service.DocumentProcessorService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.SourceService;
import io.github.mucsi96.learnlanguage.util.BeanUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import com.azure.core.util.BinaryData;

@RestController
@RequiredArgsConstructor
public class SourceController {

  private final SourceService sourceService;
  private final CardService cardService;
  private final DocumentProcessorService documentProcessorService;
  private final AreaWordsService areaWordsService;
  private final FileStorageService fileStorageService;
  private final DocumentRepository documentRepository;

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

      Integer pageCount = null;
      if (source.getSourceType() == SourceType.IMAGES) {
        pageCount = documentRepository.findMaxPageNumberBySource(source).orElse(0);
      }

      return SourceResponse.builder()
          .id(source.getId())
          .name(source.getName())
          .sourceType(source.getSourceType())
          .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
          .pageCount(pageCount)
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

    var areaWords = areaWordsService.getAreaWords(imageData, model, source.getFormatType(), source.getLanguageLevel());

    List<String> germanWords = areaWords.stream()
        .map(word -> word.getWord())
        .toList();

    var cards = cardService.getCardsByGermanWords(germanWords);

    var words = areaWords.stream().map(word -> {
      word.setExists(cards.stream().anyMatch(card ->
          card.getData() != null && word.getWord().equals(card.getData().getWord())));
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
        .sourceType(request.getSourceType())
        .startPage(request.getStartPage())
        .languageLevel(request.getLanguageLevel())
        .cardType(request.getCardType())
        .formatType(request.getFormatType())
        .build();

    sourceService.saveSource(source);

    if (request.getSourceType() == SourceType.PDF && request.getFileName() != null) {
      Document document = Document.builder()
          .source(source)
          .fileName(request.getFileName())
          .pageNumber(null)
          .build();
      documentRepository.save(document);
    }

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
        .sourceType(request.getSourceType())
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

  @PostMapping("/source/{sourceId}/documents")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, Object>> uploadDocument(
      @PathVariable String sourceId,
      @RequestParam("file") MultipartFile file) {
    try {
      Source source = sourceService.getSourceById(sourceId)
          .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

      if (source.getSourceType() != SourceType.IMAGES) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Document upload is only supported for image sources");
        return ResponseEntity.badRequest().body(errorResponse);
      }

      String originalFilename = file.getOriginalFilename();
      if (originalFilename == null || !isImageFile(originalFilename)) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed");
        return ResponseEntity.badRequest().body(errorResponse);
      }

      Integer maxPageNumber = documentRepository.findMaxPageNumberBySource(source).orElse(0);
      int newPageNumber = maxPageNumber + 1;

      BinaryData fileData = BinaryData.fromBytes(file.getBytes());
      fileStorageService.saveFile(fileData, "sources/" + sourceId + "/" + originalFilename);

      Document document = Document.builder()
          .source(source)
          .fileName(originalFilename)
          .pageNumber(newPageNumber)
          .build();
      documentRepository.save(document);

      Map<String, Object> response = new HashMap<>();
      response.put("fileName", originalFilename);
      response.put("pageNumber", newPageNumber);
      response.put("detail", "Document uploaded successfully");
      return ResponseEntity.ok(response);
    } catch (IOException e) {
      Map<String, Object> errorResponse = new HashMap<>();
      errorResponse.put("error", "Failed to upload document: " + e.getMessage());
      return ResponseEntity.internalServerError().body(errorResponse);
    }
  }

  @DeleteMapping("/source/{sourceId}/documents/{pageNumber}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteDocument(
      @PathVariable String sourceId,
      @PathVariable int pageNumber) {
    Source source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    Document document = documentRepository.findBySourceAndPageNumber(source, pageNumber)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found for page " + pageNumber));

    fileStorageService.deleteFile("sources/" + sourceId + "/" + document.getFileName());
    documentRepository.delete(document);

    Map<String, String> response = new HashMap<>();
    response.put("detail", "Document deleted successfully");
    return ResponseEntity.ok(response);
  }

  @GetMapping(value = "/source/{sourceId}/document/{pageNumber}/image")
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<byte[]> getDocumentImage(
      @PathVariable String sourceId,
      @PathVariable int pageNumber) {
    Source source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    if (source.getSourceType() != SourceType.IMAGES) {
      throw new ResourceNotFoundException("Source is not an image source");
    }

    Document document = documentRepository.findBySourceAndPageNumber(source, pageNumber)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found for page " + pageNumber));

    byte[] imageData = fileStorageService.fetchFile("sources/" + sourceId + "/" + document.getFileName()).toBytes();
    MediaType mediaType = getMediaTypeForFile(document.getFileName());

    return ResponseEntity.ok()
        .contentType(mediaType)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(imageData);
  }

  private MediaType getMediaTypeForFile(String fileName) {
    String lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".png")) {
      return MediaType.IMAGE_PNG;
    } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
      return MediaType.IMAGE_JPEG;
    } else if (lowerName.endsWith(".gif")) {
      return MediaType.IMAGE_GIF;
    } else if (lowerName.endsWith(".webp")) {
      return MediaType.parseMediaType("image/webp");
    }
    return MediaType.APPLICATION_OCTET_STREAM;
  }

  private boolean isImageFile(String filename) {
    String lowerName = filename.toLowerCase();
    return lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".gif") ||
        lowerName.endsWith(".webp");
  }
}
