package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DictionaryRequest {
    private String bookTitle;
    private String author;
    private String targetLanguage;
    private String sentence;
    private String highlightedWord;
    private String model;
}
