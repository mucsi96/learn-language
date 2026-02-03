package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class CardRepositoryCustomImpl implements CardRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public List<Card> findRandomCards(int limit) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<Card> query = cb.createQuery(Card.class);
        query.from(Card.class);
        query.orderBy(cb.asc(cb.function("random", Double.class)));
        return entityManager.createQuery(query)
                .setMaxResults(limit)
                .getResultList();
    }

    @Override
    public List<Card> findDueCardsBySourceId(String sourceId) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<Card> query = cb.createQuery(Card.class);
        final Root<Card> root = query.from(Card.class);
        final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);

        query.where(
                cb.equal(root.get("source").get("id"), sourceId),
                cb.equal(root.get("readiness"), CardReadiness.READY),
                cb.lessThanOrEqualTo(root.get("due"), cutoff));
        query.orderBy(cb.asc(root.get("due")));

        return entityManager.createQuery(query)
                .setMaxResults(50)
                .getResultList();
    }

    @Override
    public List<Object[]> findTop50MostDueGroupedByStateAndSourceId() {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<Card> query = cb.createQuery(Card.class);
        final Root<Card> root = query.from(Card.class);
        final LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.UTC).plusHours(1);

        query.where(
                cb.equal(root.get("readiness"), CardReadiness.READY),
                cb.lessThanOrEqualTo(root.get("due"), cutoff));
        query.orderBy(cb.asc(root.get("due")));

        final List<Card> dueCards = entityManager.createQuery(query).getResultList();

        return dueCards.stream()
                .collect(Collectors.groupingBy(card -> card.getSource().getId()))
                .entrySet().stream()
                .flatMap(entry -> entry.getValue().stream().limit(50))
                .collect(Collectors.groupingBy(
                        card -> Map.entry(card.getSource().getId(), card.getState()),
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new Object[] {
                        entry.getKey().getKey(),
                        entry.getKey().getValue(),
                        entry.getValue()
                })
                .toList();
    }

    @Override
    public List<Object[]> countCardsBySourceGroupBySource() {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        final Root<Card> root = query.from(Card.class);

        query.multiselect(root.get("source").get("id"), cb.count(root));
        query.groupBy(root.get("source"));

        return entityManager.createQuery(query).getResultList();
    }

    @Override
    public void updateReadinessByIds(List<String> ids, String readiness) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.<String>get("readiness"), readiness);
        update.where(root.get("id").in(ids));

        entityManager.createQuery(update).executeUpdate();
    }
}
