package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import io.github.mucsi96.learnlanguage.entity.ChatModelSetting_;
import io.github.mucsi96.learnlanguage.model.OperationType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaUpdate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
public class ChatModelSettingRepositoryCustomImpl implements ChatModelSettingRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void clearPrimaryByOperationType(OperationType operationType) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<ChatModelSetting> update = cb.createCriteriaUpdate(ChatModelSetting.class);
        final Root<ChatModelSetting> root = update.from(ChatModelSetting.class);

        update.set(root.get(ChatModelSetting_.isPrimary), false);
        update.where(
                cb.equal(root.get(ChatModelSetting_.operationType), operationType),
                cb.isTrue(root.get(ChatModelSetting_.isPrimary)));

        entityManager.createQuery(update).executeUpdate();
    }

    @Override
    @Transactional
    public void enableByOperationType(OperationType operationType) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaUpdate<ChatModelSetting> update = cb.createCriteriaUpdate(ChatModelSetting.class);
        final Root<ChatModelSetting> root = update.from(ChatModelSetting.class);

        update.set(root.get(ChatModelSetting_.isEnabled), true);
        update.where(cb.equal(root.get(ChatModelSetting_.operationType), operationType));

        entityManager.createQuery(update).executeUpdate();
    }
}
