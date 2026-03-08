package io.github.mucsi96.learnlanguage.repository;

public interface SourceCardStatsProjection {
    String getSourceId();
    String getReadiness();
    String getState();
    Boolean getFlagged();
    Boolean getUnhealthy();
    Long getCount();
}
