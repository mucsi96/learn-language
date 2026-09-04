package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayGoalSettingRequest {
    @NotNull
    @Min(0)
    @Max(100)
    private Integer requiredCompletionPercent;

    @NotNull
    @Min(0)
    @Max(100)
    private Integer requiredAccuracyPercent;
}
