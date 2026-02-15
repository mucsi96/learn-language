package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.CardView;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CardViewRepository
        extends JpaRepository<CardView, String>, JpaSpecificationExecutor<CardView> {

    List<CardView> findByReadinessOrderByDueAsc(String readiness);

    @Query("SELECT c FROM CardView c ORDER BY c.lastReview DESC")
    List<CardView> findTopByOrderByLastReviewDesc(Pageable pageable);

    @Query("SELECT c.sourceId, COUNT(c) FROM CardView c GROUP BY c.sourceId")
    List<Object[]> countCardsBySourceGroupBySource();

    @Query(value = """
        SELECT source_id, state, COUNT(*) AS card_count
        FROM (
            SELECT source_id, state,
                   ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY due ASC) AS row_num
            FROM learn_language.card_view
            WHERE readiness = 'READY' AND due at time zone 'UTC' <= NOW() + INTERVAL '1 hour'
        ) AS ranked
        WHERE row_num <= 50
        GROUP BY source_id, state
        """, nativeQuery = true)
    List<Object[]> findTop50MostDueGroupedByStateAndSourceId();

    @Modifying
    @Transactional
    @Query(value = "REFRESH MATERIALIZED VIEW CONCURRENTLY learn_language.card_view", nativeQuery = true)
    void refresh();
}
