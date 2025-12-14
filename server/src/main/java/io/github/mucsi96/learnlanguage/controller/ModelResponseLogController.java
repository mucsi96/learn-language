package io.github.mucsi96.learnlanguage.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.ModelResponseLog;
import io.github.mucsi96.learnlanguage.model.ModelResponseLogRequest;
import io.github.mucsi96.learnlanguage.repository.ModelResponseLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ModelResponseLogController {

    private final ModelResponseLogRepository modelResponseLogRepository;

    @PostMapping("/model-response-logs")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<ModelResponseLog> createLog(@RequestBody ModelResponseLogRequest request) {
        ModelResponseLog log = ModelResponseLog.builder()
                .operationType(request.getOperationType())
                .input(request.getInput())
                .responses(request.getResponses())
                .diffSummary(request.getDiffSummary())
                .createdAt(LocalDateTime.now())
                .build();

        ModelResponseLog savedLog = modelResponseLogRepository.save(log);
        return ResponseEntity.ok(savedLog);
    }

    @GetMapping("/model-response-logs")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<List<ModelResponseLog>> getLogs(
            @RequestParam(required = false) String operationType) {
        List<ModelResponseLog> logs;

        if (operationType != null && !operationType.isEmpty()) {
            logs = modelResponseLogRepository.findByOperationTypeOrderByCreatedAtDesc(operationType);
        } else {
            logs = modelResponseLogRepository.findAllByOrderByCreatedAtDesc();
        }

        return ResponseEntity.ok(logs);
    }
}
