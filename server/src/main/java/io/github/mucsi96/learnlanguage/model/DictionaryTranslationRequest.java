package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DictionaryTranslationRequest {
    @NotBlank
    @Size(max = 200)
    private String bookTitle;

    @NotBlank
    @Size(max = 200)
    private String author;

    @NotBlank
    @Size(max = 10)
    private String targetLanguage;

    @NotBlank
    @Size(max = 1000)
    private String sentence;

    @NotBlank
    @Size(max = 200)
    private String highlightedWord;
}
