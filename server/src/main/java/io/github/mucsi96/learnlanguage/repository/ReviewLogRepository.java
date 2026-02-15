package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewLogRepository
        extends JpaRepository<ReviewLog, Integer>, JpaSpecificationExecutor<ReviewLog> {
    List<ReviewLog> findByCardId(String cardId);

    @Modifying
    void deleteByCardIdIn(List<String> cardIds);

    @Query(value = """
        SELECT card_id,
               (4.0 - rating) * GREATEST(EXTRACT(EPOCH FROM NOW() - review) / 86400, 1) as complexity
        FROM (
            SELECT DISTINCT ON (card_id) card_id, rating, review
            FROM learn_language.review_logs
            WHERE card_id IN :cardIds AND learning_partner_id IS NULL
            ORDER BY card_id, review DESC
        ) latest_reviews
        """, nativeQuery = true)
    List<Object[]> findCardComplexitiesWithoutPartner(@Param("cardIds") List<String> cardIds);

    @Query(value = """
        SELECT card_id,
               (4.0 - rating) * GREATEST(EXTRACT(EPOCH FROM NOW() - review) / 86400, 1) as complexity
        FROM (
            SELECT DISTINCT ON (card_id) card_id, rating, review
            FROM learn_language.review_logs
            WHERE card_id IN :cardIds AND learning_partner_id = :learningPartnerId
            ORDER BY card_id, review DESC
        ) latest_reviews
        """, nativeQuery = true)
    List<Object[]> findCardComplexitiesWithPartner(
        @Param("cardIds") List<String> cardIds,
        @Param("learningPartnerId") Integer learningPartnerId);

    @Query(value = """
        SELECT r.card_id, r.rating, lp.name as learning_partner_name
        FROM (
            SELECT DISTINCT ON (card_id) card_id, rating, learning_partner_id
            FROM learn_language.review_logs
            WHERE card_id IN :cardIds
            ORDER BY card_id, review DESC
        ) r
        LEFT JOIN learn_language.learning_partners lp ON r.learning_partner_id = lp.id
        """, nativeQuery = true)
    List<Object[]> findLatestReviewInfoByCardIds(@Param("cardIds") List<String> cardIds);

    @Query(value = """
        SELECT
          card_id,
          CASE
            WHEN stats.cnt = 0 THEN NULL
            WHEN stats.cnt = 1 THEN CASE WHEN stats.last_rating >= 3 THEN 100.0 ELSE 0.0 END
            ELSE (CASE WHEN stats.last_rating >= 3 THEN 50.0 ELSE 0.0 END +
                  50.0 * (stats.success_count - CASE WHEN stats.last_rating >= 3 THEN 1 ELSE 0 END) / (stats.cnt - 1))
          END as review_score
        FROM (
          SELECT
            r.card_id,
            COUNT(*) as cnt,
            COUNT(*) FILTER (WHERE r.rating >= 3) as success_count,
            (SELECT r2.rating FROM learn_language.review_logs r2
             WHERE r2.card_id = r.card_id ORDER BY r2.review DESC LIMIT 1) as last_rating
          FROM learn_language.review_logs r
          WHERE r.card_id IN :cardIds
          GROUP BY r.card_id
        ) stats
        """, nativeQuery = true)
    List<Object[]> findReviewScoresByCardIds(@Param("cardIds") List<String> cardIds);
}
