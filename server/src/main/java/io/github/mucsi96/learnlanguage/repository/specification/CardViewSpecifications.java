package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.CardView;
import io.github.mucsi96.learnlanguage.entity.CardView_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import org.springframework.data.jpa.domain.PredicateSpecification;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

public class CardViewSpecifications {

    private CardViewSpecifications() {
    }

    public static PredicateSpecification<CardView> hasReadinessIn(List<CardReadiness> readinessValues) {
        return (root, cb) -> root.get(CardView_.readiness).in(readinessValues);
    }

    public static PredicateSpecification<CardView> hasSourceId(String sourceId) {
        return (root, cb) -> cb.equal(root.get(CardView_.sourceId), sourceId);
    }

    public static PredicateSpecification<CardView> hasState(String state) {
        return (root, cb) -> cb.equal(root.get(CardView_.state), state);
    }

    public static PredicateSpecification<CardView> hasMinReps(int minReps) {
        return (root, cb) -> cb.greaterThanOrEqualTo(root.get(CardView_.reps), minReps);
    }

    public static PredicateSpecification<CardView> hasMaxReps(int maxReps) {
        return (root, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.reps), maxReps);
    }

    public static PredicateSpecification<CardView> hasLastReviewAfter(int daysAgo, LocalDateTime startOfDayUtc) {
        return (root, cb) -> {
            final LocalDateTime from = startOfDayUtc.minusDays(daysAgo);
            return cb.greaterThanOrEqualTo(root.get(CardView_.lastReview), from);
        };
    }

    public static PredicateSpecification<CardView> hasLastReviewRating(int rating) {
        return (root, cb) -> cb.equal(root.get(CardView_.lastReviewRating), rating);
    }

    public static PredicateSpecification<CardView> hasMinReviewScore(int minScore) {
        return (root, cb) -> cb.greaterThanOrEqualTo(root.get(CardView_.reviewScore), minScore);
    }

    public static PredicateSpecification<CardView> hasMaxReviewScore(int maxScore) {
        return (root, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.reviewScore), maxScore);
    }

    public static PredicateSpecification<CardView> hasCardFilter(String search) {
        return (root, cb) -> {
            final String pattern = "%" + search.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("id")), pattern);
        };
    }

    public static PredicateSpecification<CardView> isDueBefore(LocalDateTime cutoff) {
        return (root, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.due), cutoff);
    }

    public static PredicateSpecification<CardView> isDue() {
        final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);
        return hasReadinessIn(List.of(CardReadiness.READY)).and(isDueBefore(cutoff));
    }

    public static PredicateSpecification<CardView> isDueForSource(String sourceId) {
        return isDue().and(hasSourceId(sourceId));
    }
}
