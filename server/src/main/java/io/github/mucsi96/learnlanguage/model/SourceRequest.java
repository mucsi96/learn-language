package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceRequest {
    private String id;
    private String name;
    private String fileName;
    private Integer startPage;
    private LanguageLevel languageLevel;
    private CardType cardType;
}
