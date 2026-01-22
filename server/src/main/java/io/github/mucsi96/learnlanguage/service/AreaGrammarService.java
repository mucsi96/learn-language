package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaGrammarService {

  public record GapInfo(int startIndex, int length) {
  }

  public record GrammarSentence(String sentence, List<GapInfo> gaps) {
  }

  record AreaGrammarSentences(List<GrammarSentence> sentences) {
  }

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    final String basePrompt = """
        You are a linguistic expert specializing in German grammar exercises.
        Your task is to extract German sentences from the provided page image that can be used for grammar practice (fill-in-the-blank exercises).
        These sentences will be used for grammar practice where learners need to fill in missing parts.

        !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentences" array.
        Each sentence object should have:
        - "sentence": the COMPLETE German sentence with all blanks/gaps filled in correctly
        - "gaps": an array of gap positions, where each gap has "startIndex" (character position where gap starts) and "length" (number of characters in the gap)

        Rules for extraction:
        1. Extract complete, meaningful sentences suitable for %s level learners
        2. If a sentence has printed placeholders (like "___", "...", or blank lines), identify what text should fill them and include the complete sentence
        3. Use AI knowledge to correctly fill in any blanks/placeholders based on German grammar rules
        4. Record the gap positions based on where the filled-in text appears in the complete sentence
        5. SKIP any handwritten text (text that appears to be written by hand/pencil)
        6. SKIP partial sentences or sentence fragments
        7. Only include sentences that have proper beginning and ending punctuation
        8. If no gaps are visible in a sentence, still extract it with an empty gaps array - gaps can be added later during editing""".formatted(languageLevel.name());

    final GrammarSentence example1 = new GrammarSentence(
        "Ich gehe jeden Tag in die Schule.",
        List.of(new GapInfo(14, 6)));
    final GrammarSentence example2 = new GrammarSentence(
        "Der Hund läuft schnell durch den Park.",
        List.of(new GapInfo(10, 6), new GapInfo(23, 3)));
    final AreaGrammarSentences example = new AreaGrammarSentences(List.of(example1, example2));

    try {
      final String exampleJson = objectMapper.writeValueAsString(example);
      return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
    } catch (JsonProcessingException e) {
      throw new RuntimeException("Failed to serialize example to JSON", e);
    }
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
