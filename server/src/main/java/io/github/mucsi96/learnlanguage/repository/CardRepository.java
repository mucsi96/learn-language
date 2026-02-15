package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;

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
    List<Card> findByIdIn(List<String> ids);

    List<Card> findByReadinessOrderByDueAsc(String readiness);

    @Query("SELECT c FROM Card c ORDER BY c.lastReview DESC")
    List<Card> findTopByOrderByLastReviewDesc(Pageable pageable);

    @Query("SELECT c.source.id, COUNT(c) FROM Card c GROUP BY c.source.id")
    List<Object[]> countCardsBySourceGroupBySource();

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

    @Modifying
    void deleteBySource(Source source);
}
