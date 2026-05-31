package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardReadiness;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CardRepository
        extends JpaRepository<Card, String>, JpaSpecificationExecutor<Card>, CardRepositoryCustom {
    List<Card> findByIdInOrderByIdAsc(List<String> ids);

    List<Card> findByReadinessOrderByDueAsc(CardReadiness readiness);

    List<Card> findByReadinessIn(List<CardReadiness> readinessList);

    @Query("SELECT c FROM Card c ORDER BY c.lastReview DESC")
    List<Card> findTopByOrderByLastReviewDesc(Pageable pageable);

    List<Card> findByFlaggedTrueOrderByDueAsc();

    @Query(value = """
        WITH ranked_cards AS (
            SELECT c.source_id, c.state, c.due,
                   ROW_NUMBER() OVER (PARTITION BY c.source_id ORDER BY c.due ASC) AS due_row_num,
                   s.card_limit,
                   s.new_card_limit
            FROM learn_language.cards c
            JOIN learn_language.sources s ON c.source_id = s.id
            WHERE c.readiness = 'READY' AND c.due < :startOfNextDay
        ),
        within_card_limit AS (
            SELECT source_id, state, due, new_card_limit
            FROM ranked_cards
            WHERE card_limit IS NULL OR due_row_num <= card_limit
        ),
        state_ranked AS (
            SELECT source_id, state, new_card_limit,
                   ROW_NUMBER() OVER (PARTITION BY source_id, state ORDER BY due ASC) AS state_row_num
            FROM within_card_limit
        )
        SELECT source_id AS sourceId, state AS state, COUNT(*) AS count
        FROM state_ranked
        WHERE new_card_limit IS NULL
           OR state <> 'NEW'
           OR state_row_num <= new_card_limit
        GROUP BY source_id, state
        """, nativeQuery = true)
    List<SourceStateCountProjection> findDueCardCountsGroupedByStateAndSource(
            @Param("startOfNextDay") LocalDateTime startOfNextDay);

    @Query(value = """
        SELECT c.source_id AS sourceId, c.readiness AS readiness, c.state AS state,
               c.flagged AS flagged, COALESCE(cv.is_unhealthy, false) AS unhealthy,
               COUNT(*) AS count,
               SUM(CASE WHEN COALESCE(cv.is_suggested_known, false) THEN 1 ELSE 0 END) AS suggestedKnownCount
        FROM learn_language.cards c
        LEFT JOIN learn_language.card_view cv ON c.id = cv.id
        GROUP BY c.source_id, c.readiness, c.state, c.flagged, cv.is_unhealthy
        """, nativeQuery = true)
    List<SourceCardStatsProjection> getSourceCardStats();

    boolean existsByIdStartingWithAndIdNot(String prefix, String id);

    @Modifying
    void deleteBySource(Source source);
}
