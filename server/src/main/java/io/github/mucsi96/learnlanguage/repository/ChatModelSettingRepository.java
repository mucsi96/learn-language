package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import io.github.mucsi96.learnlanguage.model.OperationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatModelSettingRepository
        extends JpaRepository<ChatModelSetting, Integer>, ChatModelSettingRepositoryCustom {
    List<ChatModelSetting> findByIsEnabledTrue();
    List<ChatModelSetting> findByIsPrimaryTrue();
    List<ChatModelSetting> findByOperationType(OperationType operationType);
    List<ChatModelSetting> findByOperationTypeAndIsEnabledTrue(OperationType operationType);
    Optional<ChatModelSetting> findByModelNameAndOperationType(String modelName, OperationType operationType);
}
