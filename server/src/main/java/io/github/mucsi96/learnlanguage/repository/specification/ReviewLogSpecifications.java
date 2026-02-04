package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import io.github.mucsi96.learnlanguage.entity.ReviewLog_;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class ReviewLogSpecifications {

    private ReviewLogSpecifications() {
    }

    public static Specification<ReviewLog> hasCardIdIn(List<String> cardIds) {
        return (root, query, cb) -> root.get(ReviewLog_.card).get(Card_.id).in(cardIds);
    }
}
