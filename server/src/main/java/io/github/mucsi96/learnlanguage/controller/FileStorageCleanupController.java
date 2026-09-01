package io.github.mucsi96.learnlanguage.controller;

import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.service.FileStorageCleanupService;
import lombok.RequiredArgsConstructor;

// Guarded at runtime instead of @Profile("test") because AOT processing for
// the native image freezes profile conditions at build time, which would drop
// this endpoint from the image entirely.
@RestController
@RequiredArgsConstructor
public class FileStorageCleanupController {

  private final FileStorageCleanupService fileStorageCleanupService;
  private final Environment environment;

  @PostMapping("/test/cleanup-storage")
  public ResponseEntity<Void> triggerCleanup() {
    if (!environment.matchesProfiles("test")) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    fileStorageCleanupService.cleanupUnreferencedFiles();
    return ResponseEntity.noContent().build();
  }
}
