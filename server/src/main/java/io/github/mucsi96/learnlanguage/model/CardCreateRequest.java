package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardCreateRequest {
    private String id;
    private String sourceId;
    private Integer sourcePageNumber;
    private CardData data;
    private String readiness;
    private LocalDateTime due;
    private Float stability;
    private Float difficulty;
    private Float elapsedDays;
    private Float scheduledDays;
    private Integer learningSteps;
    private Integer reps;
    private Integer lapses;
    private String state;
    private LocalDateTime lastReview;
}
