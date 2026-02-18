package io.github.mucsi96.learnlanguage.service;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.imageio.ImageIO;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.ExampleImageData;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageCleanupService {

  private static final List<String> REVIEWED_READINESS = List.of("REVIEWED", "READY", "KNOWN");
  private static final int MAX_IMAGE_DIMENSION = 1200;

  private final FileStorageService fileStorageService;
  private final CardRepository cardRepository;
  private final DocumentRepository documentRepository;
  private final ImageResizeService imageResizeService;

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void cleanupUnreferencedFiles() {
    stripNonFavoriteImagesFromReviewedCards();
    cleanupAudioFiles();
    cleanupImageFiles();
    cleanupSourceDocuments();
    resizeOversizedImages();
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

    final Set<String> referencedPaths = cards.stream()
        .map(Card::getData)
        .flatMap(data -> Optional.ofNullable(data.getAudio())
            .map(List::stream)
            .orElse(Stream.empty()))
        .map(AudioData::getId)
        .map(id -> "audio/%s.mp3".formatted(id))
        .collect(Collectors.toSet());

    allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .forEach(file -> {
          log.info("Deleting unreferenced audio file: {}", file);
          fileStorageService.deleteFile(file);
        });
  }

  private void cleanupImageFiles() {
    final var allFiles = fileStorageService.listFiles("images");
    final var cards = cardRepository.findAll();

    final Set<String> referencedPaths = cards.stream()
        .map(Card::getData)
        .flatMap(data -> Optional.ofNullable(data.getExamples())
            .map(List::stream)
            .orElse(Stream.empty()))
        .flatMap(example -> Optional.ofNullable(example.getImages())
            .map(List::stream)
            .orElse(Stream.empty()))
        .map(ExampleImageData::getId)
        .map(id -> "images/%s.jpg".formatted(id))
        .collect(Collectors.toSet());

    allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .forEach(file -> {
          log.info("Deleting unreferenced image file: {}", file);
          fileStorageService.deleteFile(file);
        });
  }

  private void cleanupSourceDocuments() {
    final var allFiles = fileStorageService.listFiles("sources");
    final var documents = documentRepository.findAllWithSource();

    final Set<String> referencedPaths = documents.stream()
        .map(doc -> doc.getPageNumber() == null
            ? "sources/%s".formatted(doc.getFileName())
            : "sources/%s/%s".formatted(doc.getSource().getId(), doc.getFileName()))
        .collect(Collectors.toSet());

    allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .forEach(file -> {
          log.info("Deleting unreferenced source document: {}", file);
          fileStorageService.deleteFile(file);
        });
  }

  private void resizeOversizedImages() {
    final var imageFiles = fileStorageService.listFiles("images");
    var resizedCount = 0;

    for (final var filePath : imageFiles) {
      try {
        final var data = fileStorageService.fetchFile(filePath).toBytes();
        final var image = ImageIO.read(new ByteArrayInputStream(data));

        if (image == null) {
          continue;
        }

        if (image.getWidth() > MAX_IMAGE_DIMENSION || image.getHeight() > MAX_IMAGE_DIMENSION) {
          final var resized = imageResizeService.resizeImage(
              data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, filePath);
          fileStorageService.saveFile(BinaryData.fromBytes(resized), filePath);
          log.info("Resized oversized image: {} ({}x{} -> max {})",
              filePath, image.getWidth(), image.getHeight(), MAX_IMAGE_DIMENSION);
          resizedCount++;
        }
      } catch (Exception e) {
        log.warn("Failed to check/resize image: {}", filePath, e);
      }
    }

    log.info("Resized {} oversized images", resizedCount);
  }
}
