package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.CardView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CardViewRepository
        extends JpaRepository<CardView, String>, JpaSpecificationExecutor<CardView> {

    @Modifying
    @Transactional
    @Query(value = "REFRESH MATERIALIZED VIEW CONCURRENTLY learn_language.card_view", nativeQuery = true)
    void refresh();
}
