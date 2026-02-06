package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Document;
import io.github.mucsi96.learnlanguage.entity.Source;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    @EntityGraph(attributePaths = {"source"})
    @Query("SELECT d FROM Document d")
    List<Document> findAllWithSource();

    List<Document> findBySourceOrderByPageNumberAsc(Source source);

    Optional<Document> findBySourceAndPageNumber(Source source, Integer pageNumber);

    Optional<Document> findBySourceAndPageNumberIsNull(Source source);

    Optional<Document> findFirstBySourceOrderByPageNumberDesc(Source source);

    void deleteBySource(Source source);
}
