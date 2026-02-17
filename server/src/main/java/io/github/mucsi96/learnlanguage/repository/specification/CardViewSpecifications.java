package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.CardView;
import io.github.mucsi96.learnlanguage.entity.CardView_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

public class CardViewSpecifications {

    private CardViewSpecifications() {
    }

    public static Specification<CardView> hasReadiness(String readiness) {
        return (root, query, cb) -> cb.equal(root.get(CardView_.readiness), readiness);
    }

    public static Specification<CardView> hasSourceId(String sourceId) {
        return (root, query, cb) -> cb.equal(root.get(CardView_.sourceId), sourceId);
    }

    public static Specification<CardView> hasState(String state) {
        return (root, query, cb) -> cb.equal(root.get(CardView_.state), state);
    }

    public static Specification<CardView> hasMinReps(int minReps) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get(CardView_.reps), minReps);
    }

    public static Specification<CardView> hasMaxReps(int maxReps) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.reps), maxReps);
    }

    public static Specification<CardView> hasLastReviewAfter(int daysAgo, LocalDateTime startOfDayUtc) {
        return (root, query, cb) -> {
            final LocalDateTime from = startOfDayUtc.minusDays(daysAgo);
            return cb.greaterThanOrEqualTo(root.get(CardView_.lastReview), from);
        };
    }

    public static Specification<CardView> hasLastReviewRating(int rating) {
        return (root, query, cb) -> cb.equal(root.get(CardView_.lastReviewRating), rating);
    }

    public static Specification<CardView> hasMinReviewScore(int minScore) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get(CardView_.reviewScore), minScore);
    }

    public static Specification<CardView> hasMaxReviewScore(int maxScore) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.reviewScore), maxScore);
    }

    public static Specification<CardView> hasCardFilter(String search) {
        return (root, query, cb) -> {
            final String pattern = "%" + search.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("id")), pattern);
        };
    }

    public static Specification<CardView> isDueBefore(LocalDateTime cutoff) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get(CardView_.due), cutoff);
    }

    public static Specification<CardView> isDue() {
        final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);
        return hasReadiness(CardReadiness.READY).and(isDueBefore(cutoff));
    }

    public static Specification<CardView> isDueForSource(String sourceId) {
        return isDue().and(hasSourceId(sourceId));
    }
}
