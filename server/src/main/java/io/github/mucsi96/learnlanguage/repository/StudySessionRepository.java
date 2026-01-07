package io.github.mucsi96.learnlanguage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, String> {
    Optional<StudySession> findBySourceId(String sourceId);
    void deleteBySourceId(String sourceId);
}
