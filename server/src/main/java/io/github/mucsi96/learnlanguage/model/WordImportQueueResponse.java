package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordImportQueueResponse {
    private List<WordImportCandidateResponse> candidates;
    private WordImportStatsResponse stats;
}
