package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import io.github.mucsi96.learnlanguage.model.OperationType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class ChatModelSettingRepositoryCustomImpl implements ChatModelSettingRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public void clearPrimaryByOperationType(OperationType operationType) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<ChatModelSetting> update = cb.createCriteriaUpdate(ChatModelSetting.class);
        final Root<ChatModelSetting> root = update.from(ChatModelSetting.class);

        update.set(root.<Boolean>get("isPrimary"), false);
        update.where(
                cb.equal(root.get("operationType"), operationType),
                cb.isTrue(root.get("isPrimary")));

        entityManager.createQuery(update).executeUpdate();
    }

    @Override
    public void enableByOperationType(OperationType operationType) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<ChatModelSetting> update = cb.createCriteriaUpdate(ChatModelSetting.class);
        final Root<ChatModelSetting> root = update.from(ChatModelSetting.class);

        update.set(root.<Boolean>get("isEnabled"), true);
        update.where(cb.equal(root.get("operationType"), operationType));

        entityManager.createQuery(update).executeUpdate();
    }
}
