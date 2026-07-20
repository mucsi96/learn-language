package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import io.github.mucsi96.learnlanguage.entity.ApiToken;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Integer> {

    @Query("select t.tokenHash from ApiToken t")
    List<String> findAllTokenHashes();
}
