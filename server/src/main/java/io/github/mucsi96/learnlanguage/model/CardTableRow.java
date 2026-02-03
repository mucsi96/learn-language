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
public class CardTableRow {
    private String id;
    private String label;
    private int reviewCount;
    private String state;
    private int sourcePageNumber;
    private Integer lastReviewGrade;
    private LocalDateTime lastReviewDate;
    private String lastReviewPerson;
}
