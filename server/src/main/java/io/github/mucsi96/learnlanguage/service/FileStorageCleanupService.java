package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

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

  private final FileStorageService fileStorageService;
  private final CardRepository cardRepository;
  private final DocumentRepository documentRepository;

  @EventListener(ApplicationReadyEvent.class)
  public void cleanupUnreferencedFiles() {
    final var deletedAudioFiles = cleanupAudioFiles();
    final var deletedImageFiles = cleanupImageFiles();
    final var deletedSourceFiles = cleanupSourceDocuments();

    log.info(
        "File storage cleanup completed. Deleted {} audio files, {} image files, {} source documents",
        deletedAudioFiles.size(), deletedImageFiles.size(), deletedSourceFiles.size());
  }

  private List<String> cleanupAudioFiles() {
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

    final var unreferenced = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferenced.forEach(file -> {
      log.info("Deleting unreferenced audio file: {}", file);
      fileStorageService.deleteFile(file);
    });

    return unreferenced;
  }

  private List<String> cleanupImageFiles() {
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

    final var unreferenced = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferenced.forEach(file -> {
      log.info("Deleting unreferenced image file: {}", file);
      fileStorageService.deleteFile(file);
    });

    return unreferenced;
  }

  private List<String> cleanupSourceDocuments() {
    final var allFiles = fileStorageService.listFiles("sources");
    final var documents = documentRepository.findAllWithSource();

    final Set<String> referencedPaths = documents.stream()
        .map(doc -> doc.getPageNumber() == null
            ? "sources/%s".formatted(doc.getFileName())
            : "sources/%s/%s".formatted(doc.getSource().getId(), doc.getFileName()))
        .collect(Collectors.toSet());

    final var unreferenced = allFiles.stream()
        .filter(file -> !referencedPaths.contains(file))
        .toList();

    unreferenced.forEach(file -> {
      log.info("Deleting unreferenced source document: {}", file);
      fileStorageService.deleteFile(file);
    });

    return unreferenced;
  }
}
