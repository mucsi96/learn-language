package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class CardData {
    private String word;
    private String type;
    private String image;
    private Map<String, String> translation;
    private List<String> forms;
    private List<Map<String, String>> examples;
}
