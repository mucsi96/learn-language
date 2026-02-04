package io.github.mucsi96.learnlanguage.repository.specification;

import io.github.mucsi96.learnlanguage.entity.StudySession;
import io.github.mucsi96.learnlanguage.entity.StudySession_;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class StudySessionSpecifications {

    private StudySessionSpecifications() {
    }

    public static Specification<StudySession> createdBefore(LocalDateTime cutoff) {
        return (root, query, cb) -> cb.lessThan(root.get(StudySession_.createdAt), cutoff);
    }
}
