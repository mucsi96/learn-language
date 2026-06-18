package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageModelSettingRequest {
    @NotBlank
    private String modelName;

    @NotNull
    @Min(0)
    private Integer imageCount;
}
