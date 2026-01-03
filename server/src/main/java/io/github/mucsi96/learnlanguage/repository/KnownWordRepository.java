package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.KnownWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KnownWordRepository extends JpaRepository<KnownWord, Integer> {
    Optional<KnownWord> findByWord(String word);
    boolean existsByWord(String word);
}
