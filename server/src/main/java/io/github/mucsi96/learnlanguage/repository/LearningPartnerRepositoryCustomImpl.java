package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import io.github.mucsi96.learnlanguage.entity.LearningPartner_;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class LearningPartnerRepositoryCustomImpl implements LearningPartnerRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public void deactivateAllExcept(Integer id) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<LearningPartner> update = cb.createCriteriaUpdate(LearningPartner.class);
        final Root<LearningPartner> root = update.from(LearningPartner.class);

        update.set(root.get(LearningPartner_.isActive), false);
        update.where(cb.notEqual(root.get(LearningPartner_.id), id));

        entityManager.createQuery(update).executeUpdate();
    }
}
