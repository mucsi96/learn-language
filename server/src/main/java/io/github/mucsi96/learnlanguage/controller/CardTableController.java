package io.github.mucsi96.learnlanguage.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardTableResponse;
import io.github.mucsi96.learnlanguage.model.CardTableRow;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.ReviewLogRepository;
import io.github.mucsi96.learnlanguage.service.cardtype.CardTypeStrategyFactory;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class CardTableController {

    private final CardRepository cardRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final CardTypeStrategyFactory cardTypeStrategyFactory;

    @GetMapping("/source/{sourceId}/cards")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<CardTableResponse> getCards(
            @PathVariable String sourceId,
            @RequestParam(defaultValue = "0") int startRow,
            @RequestParam(defaultValue = "100") int endRow,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) String readiness,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Integer minReps,
            @RequestParam(required = false) Integer maxReps,
            @RequestParam(required = false) Integer lastReviewDaysAgo,
            @RequestParam(required = false) Integer lastReviewRating) {

        final Specification<Card> spec = buildSpecification(
                sourceId, readiness, state, minReps, maxReps,
                lastReviewDaysAgo, lastReviewRating);

        final int pageSize = Math.max(1, endRow - startRow);
        final int page = startRow / pageSize;

        final Sort sort = buildSort(sortField, sortDirection);
        final PageRequest pageRequest = PageRequest.of(page, pageSize, sort);

        final Page<Card> cardPage = cardRepository.findAll(spec, pageRequest);
        final List<Card> cards = cardPage.getContent();

        final List<String> cardIds = cards.stream().map(Card::getId).toList();
        final Map<String, ReviewLog> latestReviews = getLatestReviews(cardIds);

        final List<CardTableRow> rows = cards.stream()
                .map(card -> mapToRow(card, latestReviews))
                .toList();

        final CardTableResponse response = CardTableResponse.builder()
                .rows(rows)
                .totalCount(cardPage.getTotalElements())
                .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/cards/mark-known")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Map<String, String>> markCardsAsKnown(@RequestBody List<String> cardIds) {
        final List<Card> cards = cardRepository.findByIdIn(cardIds);

        cards.stream()
                .map(card -> {
                    card.setReadiness(CardReadiness.KNOWN);
                    return card;
                })
                .forEach(cardRepository::save);

        return ResponseEntity.ok(Map.of("detail",
                String.format("%d card(s) marked as known", cards.size())));
    }

    private Specification<Card> buildSpecification(
            String sourceId, String readiness, String state,
            Integer minReps, Integer maxReps,
            Integer lastReviewDaysAgo, Integer lastReviewRating) {

        return (root, query, cb) -> {
            Predicate predicate = cb.equal(root.get("source").get("id"), sourceId);

            if (readiness != null && !readiness.isEmpty()) {
                predicate = cb.and(predicate, cb.equal(root.get("readiness"), readiness));
            }

            if (state != null && !state.isEmpty()) {
                predicate = cb.and(predicate, cb.equal(root.get("state"), state));
            }

            if (minReps != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("reps"), minReps));
            }

            if (maxReps != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("reps"), maxReps));
            }

            if (lastReviewDaysAgo != null) {
                final LocalDateTime from = LocalDate.now().minusDays(lastReviewDaysAgo).atStartOfDay();
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("lastReview"), from));
            }

            if (lastReviewRating != null) {
                final Subquery<LocalDateTime> maxReviewSub = query.subquery(LocalDateTime.class);
                final Root<ReviewLog> rlMax = maxReviewSub.from(ReviewLog.class);
                maxReviewSub.select(cb.greatest(rlMax.<LocalDateTime>get("review")))
                        .where(cb.equal(rlMax.get("card"), root));

                final Subquery<Integer> existsSub = query.subquery(Integer.class);
                final Root<ReviewLog> rl = existsSub.from(ReviewLog.class);
                existsSub.select(rl.get("id"))
                        .where(
                                cb.equal(rl.get("card"), root),
                                cb.equal(rl.get("review"), maxReviewSub),
                                cb.equal(rl.get("rating"), lastReviewRating));

                predicate = cb.and(predicate, cb.exists(existsSub));
            }

            return predicate;
        };
    }

    private Sort buildSort(String sortField, String sortDirection) {
        if (sortField == null || sortField.isEmpty()) {
            return Sort.by(Sort.Direction.ASC, "due");
        }

        final Sort.Direction direction = "desc".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        final String mappedField = switch (sortField) {
            case "reps" -> "reps";
            case "lastReviewDaysAgo" -> "lastReview";
            case "state" -> "state";
            case "readiness" -> "readiness";
            default -> "due";
        };

        return Sort.by(direction, mappedField);
    }

    private Map<String, ReviewLog> getLatestReviews(List<String> cardIds) {
        if (cardIds.isEmpty()) {
            return Map.of();
        }

        return reviewLogRepository.findLatestReviewsByCardIds(cardIds).stream()
                .collect(Collectors.toMap(
                        r -> r.getCard().getId(),
                        Function.identity(),
                        (a, b) -> a.getReview().isAfter(b.getReview()) ? a : b));
    }

    private CardTableRow mapToRow(Card card, Map<String, ReviewLog> latestReviews) {
        final var strategy = cardTypeStrategyFactory.getStrategy(card);
        final String label = strategy.getPrimaryText(card.getData());
        final ReviewLog review = latestReviews.get(card.getId());
        final Integer lastReviewDaysAgo = card.getLastReview() != null
                ? (int) ChronoUnit.DAYS.between(card.getLastReview().toLocalDate(), LocalDate.now())
                : null;

        return CardTableRow.builder()
                .id(card.getId())
                .label(label)
                .readiness(card.getReadiness())
                .state(card.getState())
                .reps(card.getReps())
                .lastReviewDaysAgo(lastReviewDaysAgo)
                .lastReviewRating(review != null ? review.getRating() : null)
                .lastReviewPerson(review != null && review.getLearningPartner() != null
                        ? review.getLearningPartner().getName()
                        : null)
                .sourcePageNumber(card.getSourcePageNumber())
                .build();
    }
}
