package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SentenceResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaSentencesService {

    record AreaSentences(List<String> sentenceList) {
    }

    private final ObjectMapper objectMapper;
    private final ChatService chatService;

    private String buildSystemPrompt(LanguageLevel languageLevel) {
        String basePrompt = """
            You are a linguistic expert specializing in German language.
            Your task is to extract German sentences from the provided page image.
            These sentences will be used for speech practice and learning.
            !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentenceList" property containing a string array of sentences.
            Extract complete, grammatically correct sentences.
            Do not extract partial sentences or incomplete phrases.
            Each sentence should be meaningful and suitable for language learning at %s level.
            """.formatted(languageLevel != null ? languageLevel.name() : "A1");

        AreaSentences example = new AreaSentences(List.of(
            "Ich gehe heute ins Kino.",
            "Das Wetter ist sehr schön.",
            "Können Sie mir bitte helfen?"
        ));

        try {
            String exampleJson = objectMapper.writeValueAsString(example);
            return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize example to JSON", e);
        }
    }

    public List<String> getAreaSentences(byte[] imageData, ChatModel model, LanguageLevel languageLevel) {
        var result = chatService.callWithLoggingAndMedia(
            model,
            "sentence_extraction",
            buildSystemPrompt(languageLevel),
            u -> u
                .text("Here is the image of the page. Extract all German sentences.")
                .media(Media.builder()
                    .data(imageData)
                    .mimeType(MimeTypeUtils.IMAGE_PNG)
                    .build()),
            AreaSentences.class);

        return result.sentenceList;
    }
}
