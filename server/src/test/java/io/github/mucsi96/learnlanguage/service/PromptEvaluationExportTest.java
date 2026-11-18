package io.github.mucsi96.learnlanguage.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.test.util.ReflectionTestUtils;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.AiLanguage;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import tools.jackson.databind.json.JsonMapper;

@EnabledIfSystemProperty(named = "prompt.export", matches = ".+")
class PromptEvaluationExportTest {
    @Test
    void exportProductionPromptsAndSchemas() throws Exception {
        final var json = JsonMapper.builder().build();
        final var answers = new AnswerCheckService(null, null, null);
        final var words = new AreaWordsService(json, null);
        final var answerPrompts = Arrays.stream(AiLanguage.values()).map(language -> {
            final var card = Card.builder()
                    .source(Source.builder().name("Prompt evaluation").startPage(1).aiLanguage(language).build())
                    .data(CardData.builder().frontText("{{question}}").backText("{{expected}}").build())
                    .build();
            final String prompt = ReflectionTestUtils.invokeMethod(answers, "buildSystemPrompt", card);
            return Map.entry("answer-" + language.name(), prompt);
        });
        final var wordPrompts = Arrays.stream(SourceFormatType.values()).flatMap(format ->
                Arrays.stream(LanguageLevel.values()).map(level -> {
                    final String prompt = ReflectionTestUtils.invokeMethod(words, "buildSystemPrompt", format, level);
                    return Map.entry("words-" + format.name() + "-" + level.name(), prompt);
                }));
        final var payload = Map.of(
                "prompts", Stream.concat(answerPrompts, wordPrompts)
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)),
                "schemas", Map.of(
                        "answer", json.readTree(new BeanOutputConverter<>(AnswerCheckService.AnswerCheckResult.class).getJsonSchema()),
                        "words", json.readTree(new BeanOutputConverter<>(AreaWordsService.ExtractedWordList.class).getJsonSchema())));
        Files.writeString(Path.of(System.getProperty("prompt.export")),
                json.writerWithDefaultPrettyPrinter().writeValueAsString(payload));
    }
}
