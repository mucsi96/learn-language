package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.Highlight;
import io.github.mucsi96.learnlanguage.entity.Source;

@Repository
public interface HighlightRepository extends JpaRepository<Highlight, Integer> {
    List<Highlight> findBySourceOrderByCreatedAtDesc(Source source);

    boolean existsBySourceAndHighlightedWordAndSentence(Source source, String highlightedWord, String sentence);

    void deleteBySource(Source source);
}
