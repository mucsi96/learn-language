package io.github.mucsi96.learnlanguage.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.model.ModelUsageLogResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ModelUsageLogController {

    private final ModelUsageLogRepository repository;

    public record RatingRequest(Integer rating) {}

    public record ModelSummary(String modelName, long totalCalls, long ratedCalls,
            BigDecimal averageRating, BigDecimal totalCost) {}

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs")
    public List<ModelUsageLogResponse> getModelUsageLogs() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
            .map(ModelUsageLogResponse::from)
            .toList();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PatchMapping("/model-usage-logs/{id}/rating")
    @Transactional
    public ResponseEntity<ModelUsageLogResponse> updateRating(@PathVariable Long id, @RequestBody RatingRequest request) {
        return repository.findById(id)
            .map(log -> {
                log.setRating(request.rating());
                repository.save(log);

                if (log.getOperationId() != null && log.getResponseContent() != null) {
                    repository.updateRatingByOperationIdAndResponseContent(
                        request.rating(), log.getOperationId(), log.getResponseContent(), id);
                }

                return ResponseEntity.ok(ModelUsageLogResponse.from(log));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs/summary")
    public List<ModelSummary> getModelSummary() {
        return repository.getModelSummary().stream()
            .map(row -> new ModelSummary(
                (String) row[0],
                (Long) row[1],
                (Long) row[2],
                BigDecimal.valueOf((Double) row[3]).setScale(2, RoundingMode.HALF_UP),
                (BigDecimal) row[4]
            ))
            .toList();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @DeleteMapping("/model-usage-logs")
    @Transactional
    public ResponseEntity<Void> deleteLogs(
            @RequestParam String date,
            @RequestParam(required = false) ModelType modelType,
            @RequestParam(required = false) OperationType operationType,
            @RequestParam(required = false) String modelName) {

        final LocalDate filterDate = LocalDate.parse(date);
        final LocalDateTime start = filterDate.atStartOfDay();
        final LocalDateTime end = filterDate.atTime(LocalTime.MAX);

        repository.deleteByFilters(start, end, modelType, operationType, modelName);

        return ResponseEntity.noContent().build();
    }
}
