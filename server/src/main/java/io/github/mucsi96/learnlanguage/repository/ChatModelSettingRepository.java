package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatModelSettingRepository extends JpaRepository<ChatModelSetting, Integer> {
    List<ChatModelSetting> findByIsEnabledTrue();
    List<ChatModelSetting> findByIsPrimaryTrue();
    List<ChatModelSetting> findByOperationType(String operationType);
    List<ChatModelSetting> findByOperationTypeAndIsEnabledTrue(String operationType);
    Optional<ChatModelSetting> findByModelNameAndOperationType(String modelName, String operationType);
}
