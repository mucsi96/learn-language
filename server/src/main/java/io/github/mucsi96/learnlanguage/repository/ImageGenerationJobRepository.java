package io.github.mucsi96.learnlanguage.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.ImageGenerationJob;
import io.github.mucsi96.learnlanguage.model.ImageGenerationJobStatus;

@Repository
public interface ImageGenerationJobRepository extends JpaRepository<ImageGenerationJob, UUID> {

  @Modifying
  @Query("UPDATE ImageGenerationJob j SET j.status = :status, j.error = :error, j.description = :description WHERE j.id = :id")
  void updateStatus(
      @Param("id") UUID id,
      @Param("status") ImageGenerationJobStatus status,
      @Param("error") String error,
      @Param("description") String description);

  int deleteByCreatedAtBefore(Instant cutoff);
}
