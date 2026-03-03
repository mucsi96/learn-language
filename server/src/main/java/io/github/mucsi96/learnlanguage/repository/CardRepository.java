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

    @Query("SELECT c.source.id, COUNT(c) FROM Card c WHERE c.readiness <> io.github.mucsi96.learnlanguage.model.CardReadiness.DRAFT GROUP BY c.source.id")
    List<Object[]> countCardsBySourceGroupBySource();

    @Query("SELECT c.source.id, COUNT(c) FROM Card c WHERE c.readiness = io.github.mucsi96.learnlanguage.model.CardReadiness.DRAFT GROUP BY c.source.id")
    List<Object[]> countDraftCardsBySourceGroupBySource();

    List<Card> findByFlaggedTrueOrderByDueAsc();

    @Query("SELECT c.source.id, COUNT(c) FROM Card c WHERE c.flagged = true GROUP BY c.source.id")
    List<Object[]> countFlaggedCardsBySourceGroupBySource();

    @Query(value = """
        SELECT source_id, state, COUNT(*) AS card_count
        FROM (
            SELECT source_id, state,
                   ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY due ASC) AS row_num
            FROM learn_language.cards
            WHERE readiness = 'READY' AND due at time zone 'UTC' <= NOW() + INTERVAL '1 hour'
        ) AS ranked
        WHERE row_num <= 50
        GROUP BY source_id, state
        """, nativeQuery = true)
    List<Object[]> findTop50MostDueGroupedByStateAndSourceId();

    boolean existsByIdStartingWithAndIdNot(String prefix, String id);

    @Modifying
    void deleteBySource(Source source);

    @Query(value = "SELECT id, ARRAY_TO_STRING(missing_fields, ', ') AS missing_fields FROM learn_language.unhealthy_cards ORDER BY due ASC", nativeQuery = true)
    List<Object[]> findUnhealthyCardIdsWithMissingFields();

    @Query(value = "SELECT source_id, COUNT(*) FROM learn_language.unhealthy_cards GROUP BY source_id", nativeQuery = true)
    List<Object[]> countUnhealthyCardsBySourceGroupBySource();
}
