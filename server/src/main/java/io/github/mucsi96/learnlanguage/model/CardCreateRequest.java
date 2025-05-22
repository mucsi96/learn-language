package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardCreateRequest {
    private String id;
    private String sourceId;
    private int pageNumber;
    private String word;
    private String type;
    private String image;
    private Map<String, String> translation;
    private List<String> forms;
    private List<ExampleData> examples;
}
