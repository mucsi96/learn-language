package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.GrammarTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GrammarTopicRepository extends JpaRepository<GrammarTopic, Integer> {
    boolean existsByName(String name);
}
