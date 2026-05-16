package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.entity.Source_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import org.springframework.data.jpa.domain.PredicateSpecification;

import java.time.LocalDateTime;

public class CardSpecifications {

    private CardSpecifications() {
    }

    public static PredicateSpecification<Card> hasReadiness(CardReadiness readiness) {
        return (root, cb) -> cb.equal(root.get(Card_.readiness), readiness);
    }

    public static PredicateSpecification<Card> isDueBefore(LocalDateTime cutoff) {
        return (root, cb) -> cb.lessThan(root.get(Card_.due), cutoff);
    }

    public static PredicateSpecification<Card> hasSourceId(String sourceId) {
        return (root, cb) -> cb.equal(root.get(Card_.source).get(Source_.id), sourceId);
    }

    public static PredicateSpecification<Card> isDueForSource(String sourceId, LocalDateTime cutoff) {
        return hasReadiness(CardReadiness.READY)
                .and(isDueBefore(cutoff))
                .and(hasSourceId(sourceId));
    }
}
