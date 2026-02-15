package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.entity.Card;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public interface CardRepositoryCustom {
    void updateReadinessByIds(List<String> ids, String readiness);
    Page<Card> findAllSortedByReviewScore(Specification<Card> spec, int page, int pageSize, Sort.Direction direction);
}
