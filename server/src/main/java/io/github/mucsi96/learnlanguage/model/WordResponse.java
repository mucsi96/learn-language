package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class WordResponse {
    private String id;
    private boolean exists;
    private String word;
    private List<String> forms;
    private List<String> examples;
}
