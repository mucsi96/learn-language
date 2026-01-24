package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaGrammarService {

  public record GrammarSentence(String sentence) {
  }

  record AreaGrammarSentences(List<GrammarSentence> sentences) {
  }

  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    return """
        You are a linguistic expert specializing in German grammar exercises.
        Your task is to extract German sentences from the provided page image that can be used for grammar practice (fill-in-the-blank exercises).
        These sentences will be used for grammar practice where learners need to fill in missing parts.

        !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentences" array.
        Each sentence object should have:
        - "sentence": the German sentence with gaps marked using square brackets around the word(s) to be filled in

        Rules for extraction:
        1. Extract complete, meaningful sentences suitable for %s level learners
        2. If a sentence has printed placeholders (like "___", "...", or blank lines), identify what text should fill them and wrap the filled text in square brackets
        3. Use AI knowledge to correctly fill in any blanks/placeholders based on German grammar rules
        4. Mark gaps by wrapping the filled-in words with square brackets, e.g. "Und [das] ist Frau Muller."
        5. SKIP any handwritten text (text that appears to be written by hand/pencil)
        6. SKIP partial sentences or sentence fragments
        7. Only include sentences that have proper beginning and ending punctuation
        8. If no gaps are visible in a sentence, still extract it without any brackets - gaps can be added later during editing

        Example of the expected JSON response:
        {"sentences":[{"sentence":"Ich gehe jeden [Tag] in die Schule."},{"sentence":"Der Hund [läuft] schnell durch [den] Park."}]}""".formatted(languageLevel.name());
  }

  public List<GrammarSentence> getAreaGrammarSentences(byte[] imageData, ChatModel model, LanguageLevel languageLevel) {
    final var result = chatService.callWithLoggingAndMedia(
        model,
        "extraction",
        buildSystemPrompt(languageLevel),
        u -> u
            .text("Here is the image of the page")
            .media(Media.builder()
                .data(imageData)
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .build()),
        AreaGrammarSentences.class);

    return result.sentences;
  }
}
