package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, String> {
  List<Card> findByIdIn(List<String> ids);

  @Query(value = """
        SELECT source_id, state, COUNT(*) AS cardCount
        FROM (
            SELECT *,
                  ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY due ASC) AS row_num
            FROM learn_language.cards
            WHERE due <= NOW()
        ) AS ranked
        WHERE row_num <= 50
        GROUP BY source_id, state
      """, nativeQuery = true)
  List<Object[]> findTop50MostDueGroupedByStateAndSourceId();
}
