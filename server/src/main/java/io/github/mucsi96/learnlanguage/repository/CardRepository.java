package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardReadiness;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
        SELECT source_id AS sourceId, state AS state, COUNT(*) AS count
        FROM (
            SELECT source_id, state,
                   ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY due ASC) AS row_num
            FROM learn_language.cards
            WHERE readiness = 'READY' AND due at time zone 'UTC' <= NOW() + INTERVAL '1 hour'
        ) AS ranked
        WHERE row_num <= 50
        GROUP BY source_id, state
        """, nativeQuery = true)
    List<SourceStateCountProjection> findTop50MostDueGroupedByStateAndSourceId();

    @Query(value = """
        SELECT c.source_id AS sourceId, c.readiness AS readiness, c.state AS state,
               c.flagged AS flagged, COALESCE(cv.is_unhealthy, false) AS unhealthy,
               COALESCE(cv.is_suggested_known, false) AS suggestedKnown, COUNT(*) AS count
        FROM learn_language.cards c
        LEFT JOIN learn_language.card_view cv ON c.id = cv.id
        GROUP BY c.source_id, c.readiness, c.state, c.flagged, cv.is_unhealthy, cv.is_suggested_known
        """, nativeQuery = true)
    List<SourceCardStatsProjection> getSourceCardStats();

    boolean existsByIdStartingWithAndIdNot(String prefix, String id);

    @Modifying
    void deleteBySource(Source source);
}
