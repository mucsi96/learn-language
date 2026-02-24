package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordNormalizationService {

    private static final String SYSTEM_PROMPT = """
            You are a German language expert.
            Your task is to normalize an inflected German word to its standard dictionary base form (Grundform).

            The word may be in any conjugated, declined, or inflected form. Use the provided sentence as context.

            Rules:
            - For verbs: use the infinitive form. If the word is part of a separable verb in the sentence, reconstruct the full infinitive (e.g., "fahren" in "Wir fahren um zwölf Uhr ab." becomes "abfahren").
            - For nouns: return the singular nominative form WITHOUT article (e.g., "Häusern" becomes "Haus", "Kindern" becomes "Kind").
            - For adjectives: use the base form (e.g., "großen" becomes "groß").
            - For other word types: return the base dictionary form.

            Also provide standard grammatical forms:
            - For nouns: the plural form with article (e.g., "die Häuser")
            - For verbs: 3rd Person Singular Präsens, 3rd Person Singular Präteritum, and 3rd Person Singular Perfekt. Only the verb forms, no pronouns.
            - For other word types: return an empty forms list.
            """;

    private final ChatService chatService;

    record NormalizationResult(String normalizedWord, List<String> forms) {
    }

    public NormalizeWordResponse normalize(String word, String sentence, ChatModel model) {
        final NormalizationResult result = chatService.callWithLogging(
                model,
                OperationType.CLASSIFICATION,
                SYSTEM_PROMPT,
                "The word is: \"%s\". The sentence is: \"%s\".".formatted(word, sentence),
                NormalizationResult.class);

        return NormalizeWordResponse.builder()
                .normalizedWord(result.normalizedWord())
                .forms(result.forms())
                .build();
    }
}
