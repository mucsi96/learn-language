package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.model.OperationType;

@Repository
public interface ModelUsageLogRepository extends JpaRepository<ModelUsageLog, Long> {
    List<ModelUsageLog> findAllByOrderByCreatedAtDesc();
    List<ModelUsageLog> findByModelTypeOrderByCreatedAtDesc(ModelType modelType);
    List<ModelUsageLog> findByOperationTypeOrderByCreatedAtDesc(OperationType operationType);
    List<ModelUsageLog> findByResponseContent(String responseContent);

    @Query("""
        SELECT m.modelName, COUNT(m), COUNT(m.rating),
               COALESCE(AVG(CAST(m.rating AS double)), 0),
               COALESCE(SUM(m.costUsd), 0)
        FROM ModelUsageLog m
        GROUP BY m.modelName
        ORDER BY COALESCE(AVG(CAST(m.rating AS double)), 0) DESC
        """)
    List<Object[]> getModelSummary();
}
