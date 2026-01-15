package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SentenceTranslationService {

    record SentenceTranslation(String translation) {
    }

    private final ChatService chatService;

    public String translateToHungarian(String germanSentence, ChatModel model) {
        String systemPrompt = """
            You are a Hungarian language expert.
            Your task is to translate the given German sentence to Hungarian.
            Provide an accurate translation that captures the meaning and natural flow of the sentence.
            Pay attention to proper Hungarian grammar and word order.
            Return only the translation in JSON format with a "translation" property.
            """;

        var result = chatService.callWithLogging(
            model,
            "sentence_translation_hu",
            systemPrompt,
            germanSentence,
            SentenceTranslation.class);

        return result.translation;
    }
}
