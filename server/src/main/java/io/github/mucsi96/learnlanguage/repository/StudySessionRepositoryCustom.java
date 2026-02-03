package io.github.mucsi96.learnlanguage.repository;

import java.time.LocalDateTime;

public interface StudySessionRepositoryCustom {
    void deleteByCreatedAtBefore(LocalDateTime cutoff);
}
