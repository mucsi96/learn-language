package io.github.mucsi96.learnlanguage.controller;

import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.parseTimezone;
import static io.github.mucsi96.learnlanguage.util.TimezoneUtils.startOfDayUtc;

import java.io.IOException;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.Document;
import io.github.mucsi96.learnlanguage.entity.ExtractionRegion;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.model.ExtractionRegionCreateRequest;
import io.github.mucsi96.learnlanguage.model.PageResponse;
import io.github.mucsi96.learnlanguage.model.RegionExtractionRequest;
import io.github.mucsi96.learnlanguage.model.SourceDueCardCountResponse;
import io.github.mucsi96.learnlanguage.model.SourceRequest;
import io.github.mucsi96.learnlanguage.model.SourceResponse;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.SentenceListResponse;
import io.github.mucsi96.learnlanguage.model.WordListResponse;
import io.github.mucsi96.learnlanguage.repository.DocumentRepository;
import io.github.mucsi96.learnlanguage.repository.ExtractionRegionRepository;
import io.github.mucsi96.learnlanguage.service.AreaGrammarService;
import io.github.mucsi96.learnlanguage.service.AreaSentenceService;
import io.github.mucsi96.learnlanguage.service.AreaWordsService;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.CardService.SourceStats;
import io.github.mucsi96.learnlanguage.service.DocumentProcessorService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.KnownWordService;
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
  private final AreaSentenceService areaSentenceService;
  private final AreaGrammarService areaGrammarService;
  private final FileStorageService fileStorageService;
  private final DocumentRepository documentRepository;
  private final ExtractionRegionRepository extractionRegionRepository;
  private final KnownWordService knownWordService;

  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  @GetMapping("/sources")
  public List<SourceResponse> getSources() {
    final var sources = sourceService.getAllSources();
    final var statsMap = cardService.getSourceStats();
    final var emptyStats = SourceStats.builder()
        .cardCount(0).draftCardCount(0).flaggedCardCount(0).unhealthyCardCount(0)
        .stateCounts(Map.of()).readinessCounts(Map.of())
        .build();

    return sources.stream().map(source -> {
      final var sourceId = source.getId();
      final var stats = statsMap.getOrDefault(sourceId, emptyStats);

      Integer pageCount = null;
      if (source.getSourceType() == SourceType.IMAGES) {
        pageCount = documentRepository.findFirstBySourceOrderByPageNumberDesc(source).map(Document::getPageNumber).orElse(0);
      }

      return SourceResponse.builder()
          .id(sourceId)
          .name(source.getName())
          .sourceType(source.getSourceType())
          .cardType(source.getCardType())
          .startPage(source.getBookmarkedPage() != null ? source.getBookmarkedPage() : source.getStartPage())
          .pageCount(pageCount)
          .cardCount(stats.getCardCount())
          .draftCardCount(stats.getDraftCardCount())
          .flaggedCardCount(stats.getFlaggedCardCount())
          .unhealthyCardCount(stats.getUnhealthyCardCount())
          .stateCounts(stats.getStateCounts())
          .readinessCounts(stats.getReadinessCounts())
          .languageLevel(source.getLanguageLevel())
          .formatType(source.getFormatType())
          .build();
    }).collect(Collectors.toList());
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @GetMapping("/source/{sourceId}/page/{pageNumber}")
  public PageResponse getPage(
      @PathVariable String sourceId,
      @PathVariable int pageNumber,
      @RequestParam(required = false) Integer documentId) throws IOException {
    final var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    final List<Document> pdfDocuments = source.getSourceType() == SourceType.PDF
        ? documentRepository.findAllBySourceAndPageNumberIsNullOrderByIdAsc(source)
        : List.of();

    final Document selectedDocument = resolveSelectedDocument(source, pdfDocuments, documentId);

    final var result = documentProcessorService.processDocument(source, pageNumber, selectedDocument);

    result.setNumber(pageNumber);
    result.setSourceId(sourceId);
    result.setSourceName(source.getName());

    if (source.getSourceType() == SourceType.PDF) {
      result.setDocuments(pdfDocuments.stream()
          .map(d -> PageResponse.DocumentInfo.builder()
              .id(d.getId())
              .fileName(d.getFileName())
              .build())
          .toList());
    }

    final var selectedDocumentId = selectedDocument != null ? selectedDocument.getId() : null;
    final var regions = (selectedDocumentId != null
        ? extractionRegionRepository.findBySourceAndPageNumberAndDocumentId(source, pageNumber, selectedDocumentId)
        : extractionRegionRepository.findBySourceAndPageNumberAndDocumentIdIsNull(source, pageNumber))
        .stream()
        .map(region -> PageResponse.PersistedExtractionRegion.builder()
            .x(region.getX())
            .y(region.getY())
            .width(region.getWidth())
            .height(region.getHeight())
            .build())
        .toList();
    result.setExtractionRegions(regions);

    source.setBookmarkedPage(result.getNumber());
    if (selectedDocument != null) {
      source.setBookmarkedDocumentId(selectedDocument.getId());
    }
    sourceService.saveSource(source);

    return result;
  }

  private Document resolveSelectedDocument(Source source, List<Document> pdfDocuments, Integer documentId) {
    if (source.getSourceType() != SourceType.PDF) {
      return null;
    }

    if (documentId != null) {
      return pdfDocuments.stream()
          .filter(d -> d.getId().equals(documentId))
          .findFirst()
          .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }

    if (source.getBookmarkedDocumentId() != null) {
      final var bookmarkedId = source.getBookmarkedDocumentId();
      return pdfDocuments.stream()
          .filter(d -> d.getId().equals(bookmarkedId))
          .findFirst()
          .orElseThrow(() -> new ResourceNotFoundException("Bookmarked document not found"));
    }

    return pdfDocuments.isEmpty() ? null : pdfDocuments.get(0);
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @PostMapping("/source/{sourceId}/extract/words")
  public WordListResponse extractWords(
      @PathVariable String sourceId,
      @RequestBody RegionExtractionRequest request) throws IOException {

    final var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    final byte[] imageData = documentProcessorService.combinePageAreas(source, request.getRegions());

    final var areaWords = areaWordsService.getAreaWords(imageData, request.getModel(), source.getFormatType(),
        source.getLanguageLevel());

    final var filteredWords = areaWords.stream()
        .filter(word -> !knownWordService.isWordKnown(word.getWord()))
        .toList();

    return WordListResponse.builder()
        .words(filteredWords)
        .build();
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @PostMapping("/source/{sourceId}/extract/sentences")
  public SentenceListResponse extractSentences(
      @PathVariable String sourceId,
      @RequestBody RegionExtractionRequest request) throws IOException {

    final var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    final byte[] imageData = documentProcessorService.combinePageAreas(source, request.getRegions());

    final var sentences = areaSentenceService.getAreaSentences(imageData, request.getModel(),
        source.getLanguageLevel());

    return SentenceListResponse.builder()
        .sentences(sentences)
        .build();
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @PostMapping("/source/{sourceId}/extract/grammar")
  public SentenceListResponse extractGrammarSentences(
      @PathVariable String sourceId,
      @RequestBody RegionExtractionRequest request) throws IOException {

    final var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found"));

    final byte[] imageData = documentProcessorService.combinePageAreas(source, request.getRegions());

    final var sentences = areaGrammarService.getAreaGrammarSentences(imageData, request.getModel(),
        source.getLanguageLevel());

    return SentenceListResponse.builder()
        .sentences(sentences)
        .build();
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  @PostMapping("/source/{sourceId}/extraction-regions")
  public ResponseEntity<Map<String, String>> saveExtractionRegions(
      @PathVariable String sourceId,
      @RequestBody ExtractionRegionCreateRequest request) {
    final var source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    final var entities = request.getRegions().stream()
        .map(region -> ExtractionRegion.builder()
            .source(source)
            .pageNumber(region.getPageNumber())
            .documentId(request.getDocumentId())
            .x(region.getX())
            .y(region.getY())
            .width(region.getWidth())
            .height(region.getHeight())
            .build())
        .toList();

    extractionRegionRepository.saveAll(entities);

    return ResponseEntity.ok(Map.of("detail", "Extraction regions saved"));
  }

  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  @GetMapping("/sources/due-cards-count")
  public List<SourceDueCardCountResponse> getDueCardsCountBySource(
      @RequestHeader(value = "X-Timezone", required = true) String timezone) {
    return cardService.getDueCardCountsBySource(startOfDayUtc(parseTimezone(timezone)));
  }

  @PostMapping("/source")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> createSource(@RequestBody SourceRequest request) {
    Source source = Source.builder()
        .id(request.getId())
        .name(request.getName())
        .sourceType(request.getSourceType())
        .startPage(request.getStartPage() != null ? request.getStartPage() : 1)
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

    return ResponseEntity.ok(Map.of());
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

    return ResponseEntity.ok(Map.of("detail", "Source updated successfully"));
  }

  @DeleteMapping("/source/{sourceId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> deleteSource(@PathVariable String sourceId) {
    Source source = sourceService.getSourceById(sourceId)
        .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

    sourceService.deleteSource(source);

    return ResponseEntity.ok(Map.of("detail", "Source deleted successfully"));
  }

  @PostMapping("/source/upload")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, String>> uploadSourceFile(@RequestParam("file") MultipartFile file) {
    try {
      final var originalFilename = file.getOriginalFilename();
      if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
        return ResponseEntity.badRequest().body(Map.of("error", "Only PDF files are allowed"));
      }

      final var fileData = BinaryData.fromBytes(file.getBytes());
      fileStorageService.saveFile(fileData, "sources/" + originalFilename);

      return ResponseEntity.ok(Map.of(
          "fileName", originalFilename,
          "detail", "File uploaded successfully"));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload file: " + e.getMessage()));
    }
  }

  @PostMapping("/source/{sourceId}/documents")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Map<String, Object>> uploadDocument(
      @PathVariable String sourceId,
      @RequestParam("file") MultipartFile file) {
    try {
      final var source = sourceService.getSourceById(sourceId)
          .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));

      final var originalFilename = file.getOriginalFilename();

      if (source.getSourceType() == SourceType.PDF) {
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
          return ResponseEntity.badRequest().body(Map.<String, Object>of("error", "Only PDF files are allowed"));
        }

        final var fileData = BinaryData.fromBytes(file.getBytes());
        fileStorageService.saveFile(fileData, "sources/" + originalFilename);

        final var savedDocument = documentRepository.save(Document.builder()
            .source(source)
            .fileName(originalFilename)
            .pageNumber(null)
            .build());

        source.setBookmarkedDocumentId(savedDocument.getId());
        sourceService.saveSource(source);

        return ResponseEntity.ok(Map.<String, Object>of(
            "fileName", originalFilename,
            "documentId", savedDocument.getId(),
            "detail", "PDF document uploaded successfully"));
      }

      if (source.getSourceType() != SourceType.IMAGES) {
        return ResponseEntity.badRequest().body(Map.<String, Object>of("error", "Document upload is only supported for PDF and image sources"));
      }

      if (originalFilename == null || !isImageFile(originalFilename)) {
        return ResponseEntity.badRequest().body(Map.<String, Object>of("error", "Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed"));
      }

      final var maxPageNumber = documentRepository.findFirstBySourceOrderByPageNumberDesc(source).map(Document::getPageNumber).orElse(0);
      final var newPageNumber = maxPageNumber + 1;

      final var fileData = BinaryData.fromBytes(file.getBytes());
      fileStorageService.saveFile(fileData, "sources/" + sourceId + "/" + originalFilename);

      documentRepository.save(Document.builder()
          .source(source)
          .fileName(originalFilename)
          .pageNumber(newPageNumber)
          .build());

      return ResponseEntity.ok(Map.<String, Object>of(
          "fileName", originalFilename,
          "pageNumber", newPageNumber,
          "detail", "Document uploaded successfully"));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.<String, Object>of("error", "Failed to upload document: " + e.getMessage()));
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

    return ResponseEntity.ok(Map.of("detail", "Document deleted successfully"));
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
