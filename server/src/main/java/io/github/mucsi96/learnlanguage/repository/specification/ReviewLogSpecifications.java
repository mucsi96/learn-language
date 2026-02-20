package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.entity.LearningPartner_;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.ReviewLog_;
import org.springframework.data.jpa.domain.PredicateSpecification;

import java.util.List;

public class ReviewLogSpecifications {

    private ReviewLogSpecifications() {
    }

    public static PredicateSpecification<ReviewLog> hasCardIdIn(List<String> cardIds) {
        return (root, cb) -> root.get(ReviewLog_.card).get(Card_.id).in(cardIds);
    }

    public static PredicateSpecification<ReviewLog> hasNoLearningPartner() {
        return (root, cb) -> cb.isNull(root.get(ReviewLog_.learningPartner));
    }

    public static PredicateSpecification<ReviewLog> hasLearningPartnerId(Integer partnerId) {
        return (root, cb) -> cb.equal(
                root.get(ReviewLog_.learningPartner).get(LearningPartner_.id),
                partnerId);
    }
}
