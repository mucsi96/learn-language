package io.github.mucsi96.learnlanguage.model;

import java.util.List;

public record LessonDescription(
    String title,
    LanguageLevel level,
    String summary,
    List<String> examples) {
}
