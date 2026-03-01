package io.github.mucsi96.learnlanguage.model;

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
public class RateLimitSettingRequest {
    @NotNull
    private String type;

    @Min(0)
    private Integer maxPerMinute;

    @Min(0)
    private Integer maxConcurrent;

    @Min(0)
    private Integer dailyLimit;
}
