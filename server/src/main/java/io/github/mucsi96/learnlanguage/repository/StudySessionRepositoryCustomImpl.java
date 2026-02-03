package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaDelete;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;

@RequiredArgsConstructor
public class StudySessionRepositoryCustomImpl implements StudySessionRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public void deleteByCreatedAtBefore(LocalDateTime cutoff) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaDelete<StudySession> delete = cb.createCriteriaDelete(StudySession.class);
        final Root<StudySession> root = delete.from(StudySession.class);

        delete.where(cb.lessThan(root.get("createdAt"), cutoff));
        entityManager.createQuery(delete).executeUpdate();
    }
}
