package io.github.mucsi96.learnlanguage.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.PredicateSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.QuotaLimitHit;
import io.github.mucsi96.learnlanguage.model.QuotaLimitHitResponse;
import io.github.mucsi96.learnlanguage.model.QuotaLimitHitTableResponse;
import io.github.mucsi96.learnlanguage.repository.QuotaLimitHitRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class QuotaLimitHitController {

    private final QuotaLimitHitRepository repository;

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/quota-limit-hits")
    public QuotaLimitHitTableResponse getQuotaLimitHits(
            @RequestParam(defaultValue = "0") int startRow,
            @RequestParam(defaultValue = "100") int endRow,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String quotaType,
            @RequestParam(required = false) String modelName,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) String sortDirection) {

        final int pageSize = Math.max(1, endRow - startRow);
        final int page = startRow / pageSize;
        final Sort sort = buildSort(sortField, sortDirection);
        final PageRequest pageRequest = PageRequest.of(page, pageSize, sort);

        final PredicateSpecification<QuotaLimitHit> spec = buildSpec(date, quotaType, modelName);
        final Page<QuotaLimitHit> hitPage = repository.findAll(Specification.where(spec), pageRequest);

        final List<QuotaLimitHitResponse> rows = hitPage.getContent().stream()
                .map(QuotaLimitHitResponse::from)
                .toList();

        return QuotaLimitHitTableResponse.builder()
                .rows(rows)
                .totalCount(hitPage.getTotalElements())
                .build();
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

    private PredicateSpecification<QuotaLimitHit> buildSpec(String date, String quotaType, String modelName) {
        PredicateSpecification<QuotaLimitHit> spec = PredicateSpecification.unrestricted();

        if (date != null && !date.isEmpty()) {
            final LocalDate filterDate = LocalDate.parse(date);
            final LocalDateTime start = filterDate.atStartOfDay();
            final LocalDateTime end = filterDate.atTime(LocalTime.MAX);
            spec = spec.and((root, cb) ->
                    cb.and(cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                            cb.lessThan(root.get("createdAt"), end)));
        }

        if (quotaType != null && !quotaType.isEmpty()) {
            spec = spec.and((root, cb) -> cb.equal(root.get("quotaType"), quotaType));
        }

        if (modelName != null && !modelName.isEmpty()) {
            spec = spec.and((root, cb) -> cb.equal(root.get("modelName"), modelName));
        }

        return spec;
    }
}
