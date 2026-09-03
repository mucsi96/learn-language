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
public class DayGoalProgressResponse {
    private int completionPercent;
    private int accuracyPercent;
    private DayGoalTier achievedTier;
    private List<TierProgress> tiers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TierProgress {
        private DayGoalTier tier;
        private int requiredCompletionPercent;
        private int requiredAccuracyPercent;
        private boolean achieved;
    }
}
