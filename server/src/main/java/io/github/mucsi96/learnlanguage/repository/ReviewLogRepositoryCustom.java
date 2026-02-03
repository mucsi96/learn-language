package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.ReviewLog;

import java.util.List;

public interface ReviewLogRepositoryCustom {
    List<ReviewLog> findLatestReviewsByCardIds(List<String> cardIds);
}
