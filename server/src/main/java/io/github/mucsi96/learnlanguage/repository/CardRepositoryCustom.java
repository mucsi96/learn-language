package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.model.CardReadiness;

import java.util.List;

public interface CardRepositoryCustom {
    void updateReadinessByIds(List<String> ids, CardReadiness readiness);
}
