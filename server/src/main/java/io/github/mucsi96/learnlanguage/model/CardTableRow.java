package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CardTableRow {
    private String id;
    private String label;
    private String readiness;
    private String state;
    private Integer reps;
    private LocalDateTime lastReview;
    private Integer lastReviewRating;
    private String lastReviewPerson;
    private Integer sourcePageNumber;
}
