package io.github.mucsi96.learnlanguage.repository;

import java.util.Collection;
import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.Highlight;
import io.github.mucsi96.learnlanguage.entity.Source;

@Repository
public interface HighlightRepository extends JpaRepository<Highlight, Integer> {
    List<Highlight> findBySourceOrderByCreatedAtDesc(Source source);

    boolean existsBySourceAndHighlightedWordAndSentence(Source source, String highlightedWord, String sentence);

    void deleteBySource(Source source);

    @Modifying
    @Query("DELETE FROM Highlight h WHERE h.source = :source AND h.candidateCardId IN :cardIds")
    int deleteBySourceAndCandidateCardIdIn(@Param("source") Source source, @Param("cardIds") Set<String> cardIds);

    @Modifying
    @Query("DELETE FROM Highlight h WHERE h.id IN :ids")
    int deleteByIdIn(@Param("ids") Collection<Integer> ids);
}
