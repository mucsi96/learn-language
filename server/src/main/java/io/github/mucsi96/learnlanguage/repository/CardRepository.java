package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, String> {
  List<Card> findByIdIn(List<String> ids);

  @Query(value = """
        SELECT source_id, state, COUNT(*) AS cardCount
        FROM (
            SELECT *,
                  ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY due ASC) AS row_num
            FROM learn_language.cards
            WHERE readiness = 'READY' AND due at time zone 'UTC' <= NOW()
        ) AS ranked
        WHERE row_num <= 50
        GROUP BY source_id, state
      """, nativeQuery = true)
  List<Object[]> findTop50MostDueGroupedByStateAndSourceId();

  @Query(value = """
      SELECT *
      FROM learn_language.cards
      WHERE source_id = :sourceId
        AND readiness = 'READY'
        AND due at time zone 'UTC' <= NOW()
      ORDER BY due ASC
      LIMIT 1
      """, nativeQuery = true)
  Optional<Card> findMostDueCardBySourceId(String sourceId);

  List<Card> findByReadinessOrderByDueAsc(String readiness);

  @Query("SELECT c.source.id, COUNT(c) FROM Card c GROUP BY c.source")
  List<Object[]> countBySourceGroupBySource();
}
