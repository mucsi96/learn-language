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
            SELECT DISTINCT ON (rl.card_id) rl.card_id, rl.rating, rl.review
            FROM learn_language.review_logs rl
            INNER JOIN (
                SELECT card_id, MAX(review::date) as last_review_date
                FROM learn_language.review_logs
                WHERE card_id IN :cardIds AND learning_partner_id IS NULL
                GROUP BY card_id
            ) latest ON rl.card_id = latest.card_id AND rl.review::date = latest.last_review_date
            WHERE rl.learning_partner_id IS NULL
            ORDER BY rl.card_id, rl.review ASC
        ) first_review_on_last_day
        """, nativeQuery = true)
    List<Object[]> findCardComplexitiesWithoutPartner(@Param("cardIds") List<String> cardIds);

    @Query(value = """
        SELECT card_id,
               (4.0 - rating) * GREATEST(EXTRACT(EPOCH FROM NOW() - review) / 86400, 1) as complexity
        FROM (
            SELECT DISTINCT ON (rl.card_id) rl.card_id, rl.rating, rl.review
            FROM learn_language.review_logs rl
            INNER JOIN (
                SELECT card_id, MAX(review::date) as last_review_date
                FROM learn_language.review_logs
                WHERE card_id IN :cardIds AND learning_partner_id = :learningPartnerId
                GROUP BY card_id
            ) latest ON rl.card_id = latest.card_id AND rl.review::date = latest.last_review_date
            WHERE rl.learning_partner_id = :learningPartnerId
            ORDER BY rl.card_id, rl.review ASC
        ) first_review_on_last_day
        """, nativeQuery = true)
    List<Object[]> findCardComplexitiesWithPartner(
        @Param("cardIds") List<String> cardIds,
        @Param("learningPartnerId") Integer learningPartnerId);
}
