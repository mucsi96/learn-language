package io.github.mucsi96.learnlanguage.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, String> {
    Optional<StudySession> findBySourceId(String sourceId);
    void deleteBySourceId(String sourceId);

    @Query("SELECT s FROM StudySession s LEFT JOIN FETCH s.cards sc LEFT JOIN FETCH sc.card WHERE s.id = :sessionId")
    Optional<StudySession> findByIdWithCards(@Param("sessionId") String sessionId);

    @Modifying
    @Query("DELETE FROM StudySession s WHERE s.createdAt < :cutoff")
    void deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
