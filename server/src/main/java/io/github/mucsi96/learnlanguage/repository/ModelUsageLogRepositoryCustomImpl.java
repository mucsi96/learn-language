package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@RequiredArgsConstructor
public class ModelUsageLogRepositoryCustomImpl implements ModelUsageLogRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public List<Object[]> getModelSummary() {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        final Root<ModelUsageLog> root = query.from(ModelUsageLog.class);

        final Expression<Double> avgRating = cb.coalesce(
                cb.avg(root.get("rating")), 0.0);

        query.multiselect(
                root.get("modelName"),
                cb.count(root),
                cb.count(root.get("rating")),
                avgRating,
                cb.coalesce(cb.sum(root.get("costUsd")), BigDecimal.ZERO));
        query.groupBy(root.get("modelName"));
        query.orderBy(cb.desc(avgRating));

        return entityManager.createQuery(query).getResultList();
    }
}
