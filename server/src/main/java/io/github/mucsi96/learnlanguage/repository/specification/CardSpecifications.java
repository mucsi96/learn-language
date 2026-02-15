package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.ReviewLog_;
import io.github.mucsi96.learnlanguage.entity.Source_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static io.github.mucsi96.learnlanguage.repository.specification.ReviewScoreSql.REVIEW_SCORE_EXPRESSION;

public class CardSpecifications {

    private CardSpecifications() {
    }

    public static Specification<Card> hasReadiness(String readiness) {
        return (root, query, cb) -> cb.equal(root.get(Card_.readiness), readiness);
    }

    public static Specification<Card> isDueBefore(LocalDateTime cutoff) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get(Card_.due), cutoff);
    }

    public static Specification<Card> hasSourceId(String sourceId) {
        return (root, query, cb) -> cb.equal(root.get(Card_.source).get(Source_.id), sourceId);
    }

    public static Specification<Card> isDue() {
        final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);
        return hasReadiness(CardReadiness.READY).and(isDueBefore(cutoff));
    }

    public static Specification<Card> isDueForSource(String sourceId) {
        return isDue().and(hasSourceId(sourceId));
    }

    public static Specification<Card> hasState(String state) {
        return (root, query, cb) -> cb.equal(root.get(Card_.state), state);
    }

    public static Specification<Card> hasMinReps(int minReps) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get(Card_.reps), minReps);
    }

    public static Specification<Card> hasMaxReps(int maxReps) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get(Card_.reps), maxReps);
    }

    public static Specification<Card> hasLastReviewAfter(int daysAgo, LocalDateTime startOfDayUtc) {
        return (root, query, cb) -> {
            final LocalDateTime from = startOfDayUtc.minusDays(daysAgo);
            return cb.greaterThanOrEqualTo(root.get(Card_.lastReview), from);
        };
    }

    public static Specification<Card> hasMinReviewScore(int minScore) {
        return (root, query, cb) -> {
            final HibernateCriteriaBuilder hcb = (HibernateCriteriaBuilder) cb;
            final Expression<Float> scoreExpr = hcb.sql(Float.class, REVIEW_SCORE_EXPRESSION, root.get(Card_.id));
            return hcb.greaterThanOrEqualTo(scoreExpr, (float) minScore);
        };
    }

    public static Specification<Card> hasMaxReviewScore(int maxScore) {
        return (root, query, cb) -> {
            final HibernateCriteriaBuilder hcb = (HibernateCriteriaBuilder) cb;
            final Expression<Float> scoreExpr = hcb.sql(Float.class, REVIEW_SCORE_EXPRESSION, root.get(Card_.id));
            return hcb.lessThanOrEqualTo(scoreExpr, (float) maxScore);
        };
    }

    public static Specification<Card> hasLastReviewRating(int rating) {
        return (root, query, cb) -> {
            final Subquery<LocalDateTime> maxReviewSub = query.subquery(LocalDateTime.class);
            final Root<ReviewLog> rlMax = maxReviewSub.from(ReviewLog.class);
            maxReviewSub.select(cb.greatest(rlMax.get(ReviewLog_.review)))
                    .where(cb.equal(rlMax.get(ReviewLog_.card), root));

            final Subquery<Integer> existsSub = query.subquery(Integer.class);
            final Root<ReviewLog> rl = existsSub.from(ReviewLog.class);
            existsSub.select(rl.get(ReviewLog_.id))
                    .where(
                            cb.equal(rl.get(ReviewLog_.card), root),
                            cb.equal(rl.get(ReviewLog_.review), maxReviewSub),
                            cb.equal(rl.get(ReviewLog_.rating), rating));

            return cb.exists(existsSub);
        };
    }
}
