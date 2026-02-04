package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewLogRepository
        extends JpaRepository<ReviewLog, Integer>, JpaSpecificationExecutor<ReviewLog> {
    List<ReviewLog> findByCardId(String cardId);
}
