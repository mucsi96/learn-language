package io.github.mucsi96.learnlanguage.model;

import io.github.mucsi96.learnlanguage.entity.Card;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionCardResponse {
    private Card card;
    private Integer learningPartnerId;
    private String presenterName;
}
