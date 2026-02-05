package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySession_;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

@RequiredArgsConstructor
public class StudySessionRepositoryCustomImpl implements StudySessionRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public Optional<StudySession> findOneWithCards(Specification<StudySession> spec) {
        final CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        final CriteriaQuery<StudySession> query = cb.createQuery(StudySession.class);
        final Root<StudySession> root = query.from(StudySession.class);

        query.where(spec.toPredicate(root, query, cb));

        final EntityGraph<StudySession> graph = entityManager.createEntityGraph(StudySession.class);
        graph.addAttributeNodes(StudySession_.CARDS);
        graph.addSubgraph(StudySession_.CARDS).addAttributeNodes("card", "learningPartner");

        final TypedQuery<StudySession> typedQuery = entityManager.createQuery(query);
        typedQuery.setHint("jakarta.persistence.fetchgraph", graph);

        return typedQuery.getResultStream().findFirst();
    }
}
