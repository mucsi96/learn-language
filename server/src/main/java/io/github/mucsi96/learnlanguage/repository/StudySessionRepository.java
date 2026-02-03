package io.github.mucsi96.learnlanguage.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, String> {
    Optional<StudySession> findBySource_IdAndCreatedAtGreaterThanEqual(String sourceId, LocalDateTime since);

    @EntityGraph(attributePaths = {"cards", "cards.card", "cards.learningPartner"})
    Optional<StudySession> findWithCardsBySource_IdAndCreatedAtGreaterThanEqual(String sourceId, LocalDateTime since);

    @Modifying
    void deleteByCreatedAtBefore(LocalDateTime cutoff);
}
