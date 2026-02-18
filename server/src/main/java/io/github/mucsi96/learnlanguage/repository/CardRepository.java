package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CardRepository
        extends JpaRepository<Card, String>, JpaSpecificationExecutor<Card>, CardRepositoryCustom {
    List<Card> findByIdInOrderByIdAsc(List<String> ids);

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

    boolean existsByIdStartingWithAndIdNot(String prefix, String id);

    @Modifying(clearAutomatically = true)
    void deleteBySource(Source source);

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = """
        UPDATE learn_language.cards
        SET data = jsonb_set(
          data,
          '{examples}',
          (
            SELECT COALESCE(jsonb_agg(
              CASE
                WHEN elem->'images' IS NOT NULL THEN
                  jsonb_set(
                    elem,
                    '{images}',
                    COALESCE(
                      (SELECT jsonb_agg(img)
                        FROM jsonb_array_elements(elem->'images') AS img
                        WHERE img->>'isFavorite' = 'true'),
                      '[]'::jsonb
                    )
                  )
                ELSE elem
              END
              ORDER BY idx
            ), '[]'::jsonb)
            FROM jsonb_array_elements(data->'examples') WITH ORDINALITY AS arr(elem, idx)
          )
        )
        WHERE readiness IN ('REVIEWED', 'READY', 'KNOWN')
          AND data->'examples' IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(data->'examples') AS ex,
                 LATERAL jsonb_array_elements(COALESCE(ex->'images', '[]'::jsonb)) AS img
            WHERE img->>'isFavorite' IS DISTINCT FROM 'true'
          )
        """, nativeQuery = true)
    int stripNonFavoriteImagesFromReviewedCards();
}
