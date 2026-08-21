package io.github.mucsi96.learnlanguage.repository;

public interface WordImportPendingCountProjection {
    String getSourceId();

    Long getCount();
}
