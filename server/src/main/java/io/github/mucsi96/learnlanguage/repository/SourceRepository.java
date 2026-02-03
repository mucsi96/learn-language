package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Source;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SourceRepository extends JpaRepository<Source, String> {
    List<Source> findAllByOrderByIdAsc();
    Optional<Source> findById(String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Source> findLockedById(String id);
}
