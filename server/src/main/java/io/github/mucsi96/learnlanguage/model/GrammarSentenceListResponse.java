package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GrammarSentenceListResponse {
    private List<GrammarSentenceResponse> sentences;
    private double x;
    private double y;
    private double width;
    private double height;
}
