package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordImportStageResponse {
    private int totalWords;
    private int stagedCount;
    private int alreadyKnownCount;
    private int existingCardCount;
    private int duplicateCount;
    private WordImportStatsResponse stats;
}
