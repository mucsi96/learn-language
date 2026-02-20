package io.github.mucsi96.learnlanguage.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.PredicateSpecification;
import org.springframework.data.jpa.domain.Specification;
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
import io.github.mucsi96.learnlanguage.model.ModelUsageLogTableResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ModelUsageLogController {

    private final ModelUsageLogRepository repository;

    public record RatingRequest(Integer rating) {}

    public record ModelSummary(OperationType operationType, String modelName, long totalCalls,
            long ratedCalls, BigDecimal averageRating, BigDecimal totalCost) {}

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs")
    public ModelUsageLogTableResponse getModelUsageLogs(
            @RequestParam(defaultValue = "0") int startRow,
            @RequestParam(defaultValue = "100") int endRow,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) ModelType modelType,
            @RequestParam(required = false) OperationType operationType,
            @RequestParam(required = false) String modelName,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) String sortDirection) {

        final int pageSize = Math.max(1, endRow - startRow);
        final int page = startRow / pageSize;
        final Sort sort = buildSort(sortField, sortDirection);
        final PageRequest pageRequest = PageRequest.of(page, pageSize, sort);

        final PredicateSpecification<ModelUsageLog> spec = buildSpec(date, modelType, operationType, modelName);
        final Page<ModelUsageLog> logPage = repository.findAll(Specification.where(spec), pageRequest);

        final List<ModelUsageLogResponse> rows = logPage.getContent().stream()
            .map(ModelUsageLogResponse::from)
            .toList();

        return ModelUsageLogTableResponse.builder()
            .rows(rows)
            .totalCount(logPage.getTotalElements())
            .build();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PatchMapping("/model-usage-logs/{id}/rating")
    @Transactional
    public ResponseEntity<Void> updateRating(@PathVariable Long id, @RequestBody RatingRequest request) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.updateRatingById(id, request.rating());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs/summary")
    public List<ModelSummary> getModelSummary() {
        return repository.getModelSummary().stream()
            .map(row -> new ModelSummary(
                (OperationType) row[0],
                (String) row[1],
                (Long) row[2],
                (Long) row[3],
                BigDecimal.valueOf((Double) row[4]).setScale(2, RoundingMode.HALF_UP),
                (BigDecimal) row[5]
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

    private Sort buildSort(String sortField, String sortDirection) {
        if (sortField == null || sortField.isEmpty()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        final Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection)
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;
        return Sort.by(direction, sortField);
    }

    private PredicateSpecification<ModelUsageLog> buildSpec(
            String date, ModelType modelType, OperationType operationType, String modelName) {

        PredicateSpecification<ModelUsageLog> spec = PredicateSpecification.unrestricted();

        if (date != null && !date.isEmpty()) {
            final LocalDate filterDate = LocalDate.parse(date);
            final LocalDateTime start = filterDate.atStartOfDay();
            final LocalDateTime end = filterDate.atTime(LocalTime.MAX);
            spec = spec.and((root, cb) ->
                cb.and(cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                       cb.lessThan(root.get("createdAt"), end)));
        }

        if (modelType != null) {
            spec = spec.and((root, cb) -> cb.equal(root.get("modelType"), modelType));
        }

        if (operationType != null) {
            spec = spec.and((root, cb) -> cb.equal(root.get("operationType"), operationType));
        }

        if (modelName != null && !modelName.isEmpty()) {
            spec = spec.and((root, cb) -> cb.equal(root.get("modelName"), modelName));
        }

        return spec;
    }
}
