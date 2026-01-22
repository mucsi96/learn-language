package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.GapData;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaGrammarSentenceService {

  public record GrammarSentence(String sentence, List<GapData> gaps) {
  }

  record AreaGrammarSentences(List<GrammarSentence> sentences) {
  }

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    final String basePrompt = """
        You are a linguistic expert specialized in grammar exercises.
        Your task is to extract German sentences with fill-in-the-blank gaps from the provided page image.
        These sentences are grammar exercises where the learner needs to fill in missing parts.

        !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentences" array.
        Each sentence object should contain:
        - "sentence": The complete German sentence with the gap filled in (the full correct answer)
        - "gaps": An array of gap objects, each with:
          - "start": The character index where the gap starts in the complete sentence
          - "end": The character index where the gap ends in the complete sentence
          - "text": The text that fills the gap

        Extract complete, meaningful sentences that are suitable for %s level learners.

        CRITICAL INSTRUCTIONS:
        - Look for printed placeholders like underscores (___), dots (...), blank lines, or boxed spaces
        - IGNORE any handwritten text with pencil or pen - only extract the printed exercise text
        - If a gap has already been filled in by handwriting, still extract it as a gap and identify what the printed placeholder was meant to be filled with
        - Do not include partial sentences or sentence fragments
        - Skip sentences that appear to be cut off at the beginning or end
        - Only include sentences that have both a clear beginning and ending
        - The "sentence" field must contain the COMPLETE correct sentence with all gaps filled in
        - The gap positions (start/end) must accurately match where the gap would appear in the complete sentence""".formatted(languageLevel.name());

    final GrammarSentence example1 = new GrammarSentence(
        "Ich gehe heute in die Schule.",
        List.of(GapData.builder().start(15).end(18).text("die").build())
    );

    final GrammarSentence example2 = new GrammarSentence(
        "Er hat gestern einen Apfel gegessen.",
        List.of(
            GapData.builder().start(7).end(14).text("gestern").build(),
            GapData.builder().start(21).end(26).text("Apfel").build()
        )
    );

    final AreaGrammarSentences exampleResponse = new AreaGrammarSentences(List.of(example1, example2));

    try {
      final String exampleJson = objectMapper.writeValueAsString(exampleResponse);
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
            .text("Here is the image of the page with grammar exercises")
            .media(Media.builder()
                .data(imageData)
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .build()),
        AreaGrammarSentences.class);

    return result.sentences;
  }
}
