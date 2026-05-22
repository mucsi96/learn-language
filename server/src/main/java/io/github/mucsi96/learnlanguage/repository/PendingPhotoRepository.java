package io.github.mucsi96.learnlanguage.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import io.github.mucsi96.learnlanguage.entity.PendingPhoto;
import io.github.mucsi96.learnlanguage.entity.Source;

public interface PendingPhotoRepository extends JpaRepository<PendingPhoto, UUID> {
  Optional<PendingPhoto> findByUserIdAndSource(String userId, Source source);

  @Modifying
  @Query("delete from PendingPhoto p where p.userId = :userId and p.source = :source")
  void deleteByUserIdAndSource(@Param("userId") String userId, @Param("source") Source source);

  @Modifying
  @Query("delete from PendingPhoto p where p.expiresAt < :cutoff")
  int deleteByExpiresAtBefore(@Param("cutoff") Instant cutoff);
}
