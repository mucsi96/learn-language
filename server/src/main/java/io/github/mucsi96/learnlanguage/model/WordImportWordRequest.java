package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WordImportWordRequest {

    @NotBlank
    @Size(max = 255)
    private String lemma;

    @Size(max = 255)
    private String wordType;

    @Size(max = 255)
    private String article;

    @NotNull
    private Integer occurrenceCount;

    @NotNull
    private List<String> examples;
}
