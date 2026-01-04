package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Document;
import io.github.mucsi96.learnlanguage.entity.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Integer> {
    List<Document> findBySourceOrderByPageNumberAsc(Source source);

    Optional<Document> findBySourceAndPageNumber(Source source, Integer pageNumber);

    @Query("SELECT MAX(d.pageNumber) FROM Document d WHERE d.source = :source")
    Optional<Integer> findMaxPageNumberBySource(@Param("source") Source source);

    void deleteBySource(Source source);
}
