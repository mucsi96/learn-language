package io.github.mucsi96.learnlanguage.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.WordImportCandidate;
import io.github.mucsi96.learnlanguage.model.WordImportStatus;

@Repository
public interface WordImportCandidateRepository extends JpaRepository<WordImportCandidate, Integer> {

    List<WordImportCandidate> findBySource_IdAndStatusOrderByOccurrenceCountDescLemmaAsc(String sourceId,
            WordImportStatus status);

    List<WordImportCandidate> findBySource_Id(String sourceId);

    Optional<WordImportCandidate> findByIdAndSource_Id(Integer id, String sourceId);

    int countBySource_IdAndStatus(String sourceId, WordImportStatus status);

    void deleteBySource_Id(String sourceId);

    int deleteByCreatedAtBefore(Instant createdBefore);

    @Query("""
            SELECT c.source.id AS sourceId, COUNT(c) AS count
            FROM WordImportCandidate c
            WHERE c.status = io.github.mucsi96.learnlanguage.model.WordImportStatus.PENDING
            GROUP BY c.source.id
            """)
    List<WordImportPendingCountProjection> countPendingGroupedBySource();
}
