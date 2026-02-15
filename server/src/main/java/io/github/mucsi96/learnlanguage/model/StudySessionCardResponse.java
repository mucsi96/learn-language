package io.github.mucsi96.learnlanguage.model;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySessionCardResponse {
    private CardResponse card;
    private Integer learningPartnerId;
    private String turnName;
    private String studyMode;
    private Map<String, Long> stateCounts;
}
