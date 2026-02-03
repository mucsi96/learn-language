package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.util.AbstractMap;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class ReviewLogRepositoryCustomImpl implements ReviewLogRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public List<ReviewLog> findLatestReviewsByCardIds(List<String> cardIds) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<ReviewLog> query = cb.createQuery(ReviewLog.class);
        final Root<ReviewLog> root = query.from(ReviewLog.class);

        query.where(root.get("card").get("id").in(cardIds));

        final List<ReviewLog> allReviews = entityManager.createQuery(query).getResultList();

        return allReviews.stream()
                .collect(Collectors.groupingBy(r -> new AbstractMap.SimpleEntry<>(
                        r.getCard().getId(),
                        Optional.ofNullable(r.getLearningPartner())
                                .map(LearningPartner::getId)
                                .orElse(0))))
                .values().stream()
                .map(group -> group.stream()
                        .max(Comparator.comparing(ReviewLog::getReview))
                        .orElseThrow())
                .toList();
    }
}
