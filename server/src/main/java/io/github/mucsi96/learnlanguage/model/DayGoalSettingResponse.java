package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayGoalSettingResponse {
    private DayGoalTier tier;
    private int requiredCompletionPercent;
    private int requiredAccuracyPercent;
}
