package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import io.github.mucsi96.learnlanguage.entity.QuotaLimitHit;

@Repository
public interface QuotaLimitHitRepository extends JpaRepository<QuotaLimitHit, Long>, JpaSpecificationExecutor<QuotaLimitHit> {
}
