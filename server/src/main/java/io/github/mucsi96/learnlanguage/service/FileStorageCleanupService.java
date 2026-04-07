package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.ExampleImageData;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageCleanupService {

  private static final List<CardReadiness> REVIEWED_READINESS = List.of(CardReadiness.REVIEWED, CardReadiness.READY);

  private final FileStorageService fileStorageService;
  private final CardRepository cardRepository;
  private final DocumentRepository documentRepository;

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void cleanupUnreferencedFiles() {
    stripAllImagesFromKnownCards();
    stripNonFavoriteImagesFromReviewedCards();
    cleanupAudioFiles();
    cleanupImageFiles();
    cleanupSourceDocuments();
  }

  private void stripAllImagesFromKnownCards() {
    final var cards = cardRepository.findByReadinessIn(List.of(CardReadiness.KNOWN)).stream()
        .filter(card -> Optional.ofNullable(card.getData().getExamples())
            .map(examples -> examples.stream()
                .anyMatch(example -> example.getImages() != null && !example.getImages().isEmpty()))
            .orElse(false))
        .toList();

    cards.forEach(card -> card.getData().getExamples()
        .forEach(example -> example.setImages(null)));

    cardRepository.saveAll(cards);
    log.info("Stripped all images from {} known cards", cards.size());
  }

  private void stripNonFavoriteImagesFromReviewedCards() {
    final var cards = cardRepository.findByReadinessIn(REVIEWED_READINESS).stream()
        .filter(card -> Optional.ofNullable(card.getData().getExamples())
            .map(examples -> examples.stream()
                .anyMatch(example -> Optional.ofNullable(example.getImages())
                    .map(images -> images.stream()
                        .anyMatch(img -> !Boolean.TRUE.equals(img.getIsFavorite())))
                    .orElse(false)))
            .orElse(false))
        .toList();

    cards.forEach(card -> card.getData().getExamples()
        .forEach(example -> example.setImages(
            Optional.ofNullable(example.getImages())
                .map(images -> images.stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsFavorite()))
                    .toList())
                .orElse(null))));

    cardRepository.saveAll(cards);
    log.info("Stripped non-favorite images from {} cards", cards.size());
  }

  private void cleanupAudioFiles() {
    final var allFiles = fileStorageService.listFiles("audio");
    final var cards = cardRepository.findAll();

    if (!allFiles.isEmpty() && cards.isEmpty()) {
      log.warn("Skipping audio cleanup: {} audio files exist but no cards found in database", allFiles.size());
      return;
    }

    final Set<String> referencedPaths = cards.stream()
        .map(Card::getData)
        .flatMap(data -> Optional.ofNullable(data.getAudio())
            .map(List::stream)
            .orElse(Stream.empty()))
        .map(AudioData::getId)
        .map(id -> "audio/%s.mp3".formatted(id))
        .collect(Collectors.toSet());

    final var unreferencedFiles = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferencedFiles.forEach(file -> {
      log.info("Deleting unreferenced audio file: {}", file);
      fileStorageService.deleteFile(file);
    });
  }

  private void cleanupImageFiles() {
    final var allFiles = fileStorageService.listFiles("images");
    final var cards = cardRepository.findAll();

    if (!allFiles.isEmpty() && cards.isEmpty()) {
      log.warn("Skipping image cleanup: {} image files exist but no cards found in database", allFiles.size());
      return;
    }

    final Set<String> referencedPaths = cards.stream()
        .map(Card::getData)
        .flatMap(data -> Optional.ofNullable(data.getExamples())
            .map(List::stream)
            .orElse(Stream.empty()))
        .flatMap(example -> Optional.ofNullable(example.getImages())
            .map(List::stream)
            .orElse(Stream.empty()))
        .map(ExampleImageData::getId)
        .map(id -> "images/%s.webp".formatted(id))
        .collect(Collectors.toSet());

    final var unreferencedFiles = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferencedFiles.forEach(file -> {
      log.info("Deleting unreferenced image file: {}", file);
      fileStorageService.deleteFile(file);
    });
  }

  private void cleanupSourceDocuments() {
    final var allFiles = fileStorageService.listFiles("sources");
    final var documents = documentRepository.findAllWithSource();

    if (!allFiles.isEmpty() && documents.isEmpty()) {
      log.warn("Skipping source document cleanup: {} source files exist but no documents found in database",
          allFiles.size());
      return;
    }

    final Set<String> referencedPaths = documents.stream()
        .map(doc -> doc.getPageNumber() == null
            ? "sources/%s".formatted(doc.getFileName())
            : "sources/%s/%s".formatted(doc.getSource().getId(), doc.getFileName()))
        .collect(Collectors.toSet());

    final var unreferencedFiles = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferencedFiles.forEach(file -> {
      log.info("Deleting unreferenced source document: {}", file);
      fileStorageService.deleteFile(file);
    });
  }
}
