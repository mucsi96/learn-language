package io.github.mucsi96.learnlanguage.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
                return ResponseEntity.ok(repository.save(log));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs/summary")
    public List<ModelSummary> getModelSummary() {
        List<ModelUsageLog> allLogs = repository.findAll();

        Map<String, List<ModelUsageLog>> byModel = allLogs.stream()
            .collect(Collectors.groupingBy(ModelUsageLog::getModelName));

        return byModel.entrySet().stream()
            .map(entry -> {
                String modelName = entry.getKey();
                List<ModelUsageLog> logs = entry.getValue();

                long totalCalls = logs.size();
                List<ModelUsageLog> ratedLogs = logs.stream()
                    .filter(log -> log.getRating() != null)
                    .toList();
                long ratedCalls = ratedLogs.size();

                BigDecimal averageRating = BigDecimal.ZERO;
                if (!ratedLogs.isEmpty()) {
                    double sum = ratedLogs.stream()
                        .mapToInt(ModelUsageLog::getRating)
                        .sum();
                    averageRating = BigDecimal.valueOf(sum / ratedCalls)
                        .setScale(2, RoundingMode.HALF_UP);
                }

                BigDecimal totalCost = logs.stream()
                    .map(log -> log.getCostUsd() != null ? log.getCostUsd() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                return new ModelSummary(modelName, totalCalls, ratedCalls, averageRating, totalCost);
            })
            .sorted((a, b) -> b.averageRating().compareTo(a.averageRating()))
            .toList();
    }
}
