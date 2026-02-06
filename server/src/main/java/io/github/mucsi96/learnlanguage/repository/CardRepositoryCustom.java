package io.github.mucsi96.learnlanguage.repository;

import java.util.List;

public interface CardRepositoryCustom {
    void updateReadinessByIds(List<String> ids, String readiness);
}
