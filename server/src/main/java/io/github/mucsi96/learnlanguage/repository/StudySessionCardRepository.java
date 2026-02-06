package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.StudySessionCard;

@Repository
public interface StudySessionCardRepository extends JpaRepository<StudySessionCard, Integer> {
}
