package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Card_;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@RequiredArgsConstructor
public class CardRepositoryCustomImpl implements CardRepositoryCustom {
    private static final String NEW_STATE = "NEW";

    private final EntityManager entityManager;

    @Override
    public void updateReadinessByIds(List<String> ids, CardReadiness readiness) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.get(Card_.readiness), readiness);
        update.where(root.get(Card_.id).in(ids));

        entityManager.createQuery(update).executeUpdate();
    }

    @Override
    public void resetFsrsAndMarkDraftByIds(List<String> ids) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<Card> update = cb.createCriteriaUpdate(Card.class);
        final Root<Card> root = update.from(Card.class);

        update.set(root.get(Card_.readiness), CardReadiness.DRAFT);
        update.set(root.get(Card_.due), LocalDateTime.now());
        update.set(root.get(Card_.stability), 0f);
        update.set(root.get(Card_.difficulty), 0f);
        update.set(root.get(Card_.elapsedDays), 0f);
        update.set(root.get(Card_.scheduledDays), 0f);
        update.set(root.get(Card_.learningSteps), 0);
        update.set(root.get(Card_.reps), 0);
        update.set(root.get(Card_.lapses), 0);
        update.set(root.get(Card_.state), NEW_STATE);
        update.set(root.get(Card_.lastReview), (LocalDateTime) null);
        update.where(root.get(Card_.id).in(ids));

        entityManager.createQuery(update).executeUpdate();
    }
}
