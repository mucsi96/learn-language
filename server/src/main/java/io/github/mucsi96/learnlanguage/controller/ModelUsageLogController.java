package io.github.mucsi96.learnlanguage.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
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
    public List<ModelUsageLog> getModelUsageLogs() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PatchMapping("/model-usage-logs/{id}/rating")
    public ResponseEntity<ModelUsageLog> updateRating(@PathVariable Long id, @RequestBody RatingRequest request) {
        return repository.findById(id)
            .map(log -> {
                log.setRating(request.rating());
                repository.save(log);

                if (log.getResponseContent() != null) {
                    List<ModelUsageLog> duplicates = repository.findByResponseContent(log.getResponseContent());
                    for (ModelUsageLog duplicate : duplicates) {
                        if (!duplicate.getId().equals(id)) {
                            duplicate.setRating(request.rating());
                            repository.save(duplicate);
                        }
                    }
                }

                return ResponseEntity.ok(log);
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
}
