package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;

import java.util.List;

public interface CardRepositoryCustom {
    List<Card> findRandomCards(int limit);

    List<Card> findDueCardsBySourceId(String sourceId);

    List<Object[]> findTop50MostDueGroupedByStateAndSourceId();

    List<Object[]> countCardsBySourceGroupBySource();

    void updateReadinessByIds(List<String> ids, String readiness);
}
