package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository
        extends JpaRepository<Card, String>, JpaSpecificationExecutor<Card>, CardRepositoryCustom {
    List<Card> findByIdIn(List<String> ids);

    List<Card> findByReadinessOrderByDueAsc(String readiness);

    @Modifying
    void deleteBySource(Source source);
}
