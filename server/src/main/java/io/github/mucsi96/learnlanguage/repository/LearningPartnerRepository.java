package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.LearningPartner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LearningPartnerRepository extends JpaRepository<LearningPartner, Integer> {
    Optional<LearningPartner> findByIsActiveTrue();

    @Modifying
    @Query("UPDATE LearningPartner p SET p.isActive = false WHERE p.id != :id")
    void deactivateAllExcept(@Param("id") Integer id);
}
