package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Source;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SourceRepository extends JpaRepository<Source, String> {
    @EntityGraph(attributePaths = { "learningPartner", "group" })
    List<Source> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = { "learningPartner", "group" })
    Optional<Source> findById(String id);

    List<Source> findByGroup_Id(String groupId);

    List<Source> findByGroup_IdIn(Collection<String> groupIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Source s LEFT JOIN FETCH s.learningPartner WHERE s.id = :id")
    Optional<Source> findByIdWithLock(@Param("id") String id);
}
