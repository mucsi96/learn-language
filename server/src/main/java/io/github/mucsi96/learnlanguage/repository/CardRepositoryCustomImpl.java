package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
public class CardRepositoryCustomImpl implements CardRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void updateReadinessByIds(List<String> ids, String readiness) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.get(Card_.readiness), readiness);
        update.where(root.get(Card_.id).in(ids));

        entityManager.createQuery(update).executeUpdate();
    }
}
