package io.github.mucsi96.learnlanguage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.AiModelSettings;

@Repository
public interface AiModelSettingsRepository extends JpaRepository<AiModelSettings, Integer> {
    List<AiModelSettings> findByOperationType(String operationType);
    Optional<AiModelSettings> findByOperationTypeAndModelName(String operationType, String modelName);
}
