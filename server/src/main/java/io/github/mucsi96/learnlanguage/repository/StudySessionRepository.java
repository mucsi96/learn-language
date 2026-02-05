package io.github.mucsi96.learnlanguage.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;

@Repository
public interface StudySessionRepository
        extends JpaRepository<StudySession, String>, JpaSpecificationExecutor<StudySession> {
    Optional<StudySession> findBySource_IdAndCreatedAtGreaterThanEqual(String sourceId, LocalDateTime since);

    @Query("""
            SELECT s FROM StudySession s
            LEFT JOIN FETCH s.cards sc
            LEFT JOIN FETCH sc.learningPartner
            LEFT JOIN FETCH sc.card c
            LEFT JOIN FETCH c.source
            WHERE s.id = :id
            """)
    Optional<StudySession> findByIdFetchCards(@Param("id") String id);
}
