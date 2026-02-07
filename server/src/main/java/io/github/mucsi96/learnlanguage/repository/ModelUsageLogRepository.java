package io.github.mucsi96.learnlanguage.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.model.OperationType;

@Repository
public interface ModelUsageLogRepository extends JpaRepository<ModelUsageLog, Long> {
    List<ModelUsageLog> findAllByOrderByCreatedAtDesc();
    List<ModelUsageLog> findByModelTypeOrderByCreatedAtDesc(ModelType modelType);
    List<ModelUsageLog> findByOperationTypeOrderByCreatedAtDesc(OperationType operationType);
    @Modifying
    @Query("UPDATE ModelUsageLog m SET m.rating = :rating "
            + "WHERE m.operationId = (SELECT o.operationId FROM ModelUsageLog o WHERE o.id = :id) "
            + "AND m.responseContent = (SELECT o.responseContent FROM ModelUsageLog o WHERE o.id = :id)")
    void updateRatingById(
            @Param("id") Long id,
            @Param("rating") Integer rating);

    @Query("SELECT m.modelName, COUNT(m), COUNT(m.rating), "
            + "COALESCE(AVG(m.rating), 0.0), "
            + "COALESCE(SUM(m.costUsd), 0) "
            + "FROM ModelUsageLog m GROUP BY m.modelName "
            + "ORDER BY COALESCE(AVG(m.rating), 0.0) DESC")
    List<Object[]> getModelSummary();

    @Modifying
    @Query("DELETE FROM ModelUsageLog m WHERE m.createdAt >= :start AND m.createdAt < :end"
            + " AND (:modelType IS NULL OR m.modelType = :modelType)"
            + " AND (:operationType IS NULL OR m.operationType = :operationType)"
            + " AND (:modelName IS NULL OR m.modelName = :modelName)")
    void deleteByFilters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("modelType") ModelType modelType,
            @Param("operationType") OperationType operationType,
            @Param("modelName") String modelName);
}
