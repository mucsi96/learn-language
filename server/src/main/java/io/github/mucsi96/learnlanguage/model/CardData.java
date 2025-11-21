package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

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
    @JsonInclude(Include.NON_DEFAULT)
    private String gender;
    private Map<String, String> translation;
    private List<String> forms;
    private List<ExampleData> examples;

    @JsonInclude(Include.NON_NULL)
    private List<AudioData> audio;

    @JsonInclude(Include.NON_NULL)
    private String pdfText;

    @JsonInclude(Include.NON_NULL)
    private ValidationData validation;
}
