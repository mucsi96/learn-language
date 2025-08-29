package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageSourceRequest {
    private String input;
    
    @NotNull(message = "Image generation model is required")
    private ImageGenerationModel model;
}
