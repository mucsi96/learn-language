package io.github.mucsi96.learnlanguage.model;

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
    private CardReadiness readiness;
    private String state;
    private Integer reps;
    private Integer lastReviewDaysAgo;
    private Integer lastReviewRating;
    private String lastReviewPerson;
    private Integer reviewScore;
    private Integer sourcePageNumber;
}
