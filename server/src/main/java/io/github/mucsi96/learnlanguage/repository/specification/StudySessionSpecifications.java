package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.Source_;
import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySession_;
import org.springframework.data.jpa.domain.PredicateSpecification;

import java.time.LocalDateTime;

public class StudySessionSpecifications {

    private StudySessionSpecifications() {
    }

    public static PredicateSpecification<StudySession> createdBefore(LocalDateTime cutoff) {
        return (root, cb) -> cb.lessThan(root.get(StudySession_.createdAt), cutoff);
    }

    public static PredicateSpecification<StudySession> hasSourceId(String sourceId) {
        return (root, cb) -> cb.equal(root.get(StudySession_.source).get(Source_.id), sourceId);
    }

    public static PredicateSpecification<StudySession> createdOnOrAfter(LocalDateTime since) {
        return (root, cb) -> cb.greaterThanOrEqualTo(root.get(StudySession_.createdAt), since);
    }
}
