package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateCardsRequest {
    private String prompt;
    private Integer count;
}
