package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

public record LessonDescription(
    @JsonPropertyDescription("Concise German title naming the lesson's single grammatical focus.") String title,
    @JsonPropertyDescription("CEFR level of the lesson.") LanguageLevel level,
    @JsonPropertyDescription("Two to four German sentences summarizing the lesson's rules and patterns.") String summary,
    @JsonPropertyDescription("Three to six representative example items from the supplied lesson.") List<String> examples) {
}
