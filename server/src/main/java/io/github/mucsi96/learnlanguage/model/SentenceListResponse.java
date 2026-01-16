package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SentenceListResponse {
    private List<SentenceResponse> sentences;
    private double x;
    private double y;
    private double width;
    private double height;
}
