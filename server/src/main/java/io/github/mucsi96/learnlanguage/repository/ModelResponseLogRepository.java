package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.ModelResponseLog;

@Repository
public interface ModelResponseLogRepository extends JpaRepository<ModelResponseLog, Long> {
    List<ModelResponseLog> findAllByOrderByCreatedAtDesc();

    List<ModelResponseLog> findByOperationTypeOrderByCreatedAtDesc(String operationType);
}
