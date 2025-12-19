package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;

@Repository
public interface ModelUsageLogRepository extends JpaRepository<ModelUsageLog, Long> {
    List<ModelUsageLog> findAllByOrderByCreatedAtDesc();
    List<ModelUsageLog> findByModelTypeOrderByCreatedAtDesc(ModelType modelType);
    List<ModelUsageLog> findByOperationTypeOrderByCreatedAtDesc(String operationType);
}
