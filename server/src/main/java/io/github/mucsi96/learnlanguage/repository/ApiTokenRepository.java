package io.github.mucsi96.learnlanguage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import io.github.mucsi96.learnlanguage.entity.ApiToken;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Integer> {
    Optional<ApiToken> findByToken(String token);

    boolean existsByToken(String token);
}
