package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WordImportCandidateResponse {
    private Integer id;
    private String lemma;
    private String wordType;
    private String article;
    private Integer occurrenceCount;
    private List<String> examples;
}
