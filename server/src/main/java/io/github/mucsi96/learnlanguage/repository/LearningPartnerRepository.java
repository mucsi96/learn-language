package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LearningPartnerRepository
        extends JpaRepository<LearningPartner, Integer>, LearningPartnerRepositoryCustom {
    Optional<LearningPartner> findByIsActiveTrue();
}
