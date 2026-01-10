package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, Integer> {
    List<ReviewLog> findByCardId(String cardId);

    @Query("""
        SELECT r FROM ReviewLog r
        WHERE r.card.id = :cardId
        ORDER BY r.review DESC
        LIMIT 1
        """)
    Optional<ReviewLog> findLastReviewByCardId(String cardId);

    @Query(value = """
        SELECT DISTINCT ON (card_id) *
        FROM learn_language.review_logs
        WHERE card_id IN :cardIds
        ORDER BY card_id, review DESC
        """, nativeQuery = true)
    List<ReviewLog> findLastReviewsByCardIds(List<String> cardIds);
}
