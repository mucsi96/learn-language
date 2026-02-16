package io.github.mucsi96.learnlanguage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySessionCard;

@Repository
public interface StudySessionCardRepository extends JpaRepository<StudySessionCard, Integer> {
    Optional<StudySessionCard> findFirstByCard_Id(String cardId);

    @Query("SELECT MAX(sc.position) FROM StudySessionCard sc WHERE sc.session.id = :sessionId")
    Optional<Integer> findMaxPositionBySessionId(@Param("sessionId") String sessionId);
}
