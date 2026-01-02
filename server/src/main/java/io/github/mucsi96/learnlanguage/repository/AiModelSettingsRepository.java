package io.github.mucsi96.learnlanguage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.AiModelSettings;

@Repository
public interface AiModelSettingsRepository extends JpaRepository<AiModelSettings, Integer> {
    Optional<AiModelSettings> findByOperationType(String operationType);
}
