package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class WordListResponse {
    private List<WordResponse> words;
    private double x;
    private double y;
    private double width;
    private double height;
}
