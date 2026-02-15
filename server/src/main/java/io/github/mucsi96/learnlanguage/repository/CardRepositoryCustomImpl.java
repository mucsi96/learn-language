package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static io.github.mucsi96.learnlanguage.repository.specification.ReviewScoreSql.REVIEW_SCORE_EXPRESSION;

@RequiredArgsConstructor
public class CardRepositoryCustomImpl implements CardRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public void updateReadinessByIds(List<String> ids, String readiness) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.get(Card_.readiness), readiness);
        update.where(root.get(Card_.id).in(ids));

        entityManager.createQuery(update).executeUpdate();
    }

    @Override
    public Page<Card> findAllSortedByReviewScore(Specification<Card> spec, int page, int pageSize, Sort.Direction direction) {
        final HibernateCriteriaBuilder hcb = (HibernateCriteriaBuilder) entityManager.getCriteriaBuilder();

        final CriteriaQuery<Long> countQuery = hcb.createQuery(Long.class);
        final Root<Card> countRoot = countQuery.from(Card.class);
        countQuery.select(hcb.count(countRoot));
        final Predicate countPredicate = spec.toPredicate(countRoot, countQuery, hcb);
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }
        final long total = entityManager.createQuery(countQuery).getSingleResult();

        final CriteriaQuery<Card> dataQuery = hcb.createQuery(Card.class);
        final Root<Card> dataRoot = dataQuery.from(Card.class);
        dataQuery.select(dataRoot);
        final Predicate dataPredicate = spec.toPredicate(dataRoot, dataQuery, hcb);
        if (dataPredicate != null) {
            dataQuery.where(dataPredicate);
        }

        final Expression<Float> scoreExpr = hcb.sql(Float.class, REVIEW_SCORE_EXPRESSION, dataRoot.get(Card_.id));
        final Expression<Float> coalesced = hcb.coalesce(scoreExpr, -1.0f);
        final Order order = direction == Sort.Direction.DESC ? hcb.desc(coalesced) : hcb.asc(coalesced);
        dataQuery.orderBy(order);

        final List<Card> cards = entityManager.createQuery(dataQuery)
                .setFirstResult(page * pageSize)
                .setMaxResults(pageSize)
                .getResultList();

        return new PageImpl<>(cards, PageRequest.of(page, pageSize), total);
    }
}
