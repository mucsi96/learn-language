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
public class CardTableRowResponse {
    private String id;
    private String sourceName;
    private String sourceType;
    private String label;
    private Integer reviewCount;
    private LocalDateTime lastReviewDate;
    private Integer lastReviewGrade;
    private String lastReviewPerson;
    private String readiness;
    private String sourceId;
    private Integer sourcePageNumber;
}
