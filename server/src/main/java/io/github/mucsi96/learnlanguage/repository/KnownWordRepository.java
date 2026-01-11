package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.KnownWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnownWordRepository extends JpaRepository<KnownWord, String> {
    List<KnownWord> findAllByOrderByGermanAsc();
}
