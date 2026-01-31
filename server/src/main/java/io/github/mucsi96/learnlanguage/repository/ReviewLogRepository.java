package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, Integer> {
    List<ReviewLog> findByCardId(String cardId);

    @Query(value = """
        SELECT DISTINCT ON (card_id, COALESCE(learning_partner_id, 0)) *
        FROM learn_language.review_logs
        WHERE card_id IN :cardIds
        ORDER BY card_id, COALESCE(learning_partner_id, 0), review DESC
        """, nativeQuery = true)
    List<ReviewLog> findLatestReviewsByCardIds(@Param("cardIds") List<String> cardIds);
}
