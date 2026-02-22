package io.github.mucsi96.learnlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import io.github.mucsi96.learnlanguage.entity.ApiToken;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Integer> {
    boolean existsByTokenHash(String tokenHash);
}
