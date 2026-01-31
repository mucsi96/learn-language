package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SentenceIdRequest {
    @NotBlank
    @Size(max = 1000)
    private String germanSentence;
}
