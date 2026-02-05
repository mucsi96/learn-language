package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface StudySessionRepositoryCustom {
    Optional<StudySession> findOneWithCards(Specification<StudySession> spec);
}
