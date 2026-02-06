package io.github.mucsi96.learnlanguage.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.service.FileStorageCleanupService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@Profile("test")
public class FileStorageCleanupController {

  private final FileStorageCleanupService fileStorageCleanupService;

  @PostMapping("/test/cleanup-storage")
  public ResponseEntity<Void> triggerCleanup() {
    fileStorageCleanupService.cleanupUnreferencedFiles();
    return ResponseEntity.noContent().build();
  }
}
