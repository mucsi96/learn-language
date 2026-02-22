package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DictionaryTranslationResponse {
    private String translatedWord;
    private String translatedSentence;
    private String wordType;
    private String gender;
    private String plural;
    private String ipaTranscription;
    private List<String> meanings;
    private List<String> synonyms;
    private List<String> antonyms;
    private List<UsageExample> usageExamples;
    private List<String> collocations;
    private String register;
    private String languageLevel;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageExample {
        private String german;
        private String translated;
    }
}
