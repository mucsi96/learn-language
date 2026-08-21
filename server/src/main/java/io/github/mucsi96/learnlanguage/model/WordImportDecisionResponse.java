package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordImportDecisionResponse {
    private Integer candidateId;
    private WordImportStatus status;
    private String cardId;
    private WordImportStatsResponse stats;
}
