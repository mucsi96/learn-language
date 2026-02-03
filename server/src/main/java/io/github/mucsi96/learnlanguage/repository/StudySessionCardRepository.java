package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySessionCard;

@Repository
public interface StudySessionCardRepository extends JpaRepository<StudySessionCard, Integer> {

    @Modifying
    @Query("UPDATE StudySessionCard sc SET sc.position = :position WHERE sc.id = :id")
    void updatePosition(@Param("id") Integer id, @Param("position") Integer position);
}
