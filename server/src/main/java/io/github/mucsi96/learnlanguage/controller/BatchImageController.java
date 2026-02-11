package io.github.mucsi96.learnlanguage.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.BatchImageJobResponse;
import io.github.mucsi96.learnlanguage.model.BatchImageRequest;
import io.github.mucsi96.learnlanguage.model.BatchImageStatusResponse;
import io.github.mucsi96.learnlanguage.service.BatchImageService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class BatchImageController {

  private final BatchImageService batchImageService;

  @PostMapping("/batch-images")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public BatchImageJobResponse createBatch(@Valid @RequestBody BatchImageRequest request) {
    return batchImageService.createBatch(request);
  }

  @GetMapping("/batch-images/{batchId}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public BatchImageStatusResponse getBatchStatus(@PathVariable String batchId) {
    return batchImageService.getBatchStatus(batchId);
  }
}
