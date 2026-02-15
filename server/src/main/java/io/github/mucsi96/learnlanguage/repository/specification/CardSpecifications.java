package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.entity.Source_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

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
}
