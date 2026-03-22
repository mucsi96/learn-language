package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionStatsResponse {
    private long totalDurationMs;
    private long averageDurationMs;
    private int goodCount;
    private int badCount;
    private int totalCards;
    private String studyMode;
    private List<PersonStats> personStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonStats {
        private String name;
        private long totalDurationMs;
        private long averageDurationMs;
        private int goodCount;
        private int badCount;
        private int totalCards;
    }
}
