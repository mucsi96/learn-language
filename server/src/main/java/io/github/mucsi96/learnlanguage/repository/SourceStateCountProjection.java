package io.github.mucsi96.learnlanguage.repository;

public interface SourceStateCountProjection {
    String getSourceId();
    String getState();
    Long getCount();
}
