package io.github.mucsi96.learnlanguage.repository;

import io.github.mucsi96.learnlanguage.model.WordImportStatus;

public interface WordImportStatusCountProjection {
    WordImportStatus getStatus();

    Long getCount();
}
