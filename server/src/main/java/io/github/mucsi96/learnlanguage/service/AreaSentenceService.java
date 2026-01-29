package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaSentenceService {

  record AreaSentences(List<String> sentences) {
  }

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    final String basePrompt = """
        You are a linguistic expert.
        Your task is to extract German sentences from the provided page image.
        These sentences will be used for speech practice and listening comprehension.
        !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentences" array containing strings.
        Extract complete, meaningful sentences that are suitable for %s level learners.
        Each sentence should be a standalone German sentence that makes sense on its own.

        Rules for extraction (!IMPORTANT! please follow these carefully):
        - Do not include partial sentences or sentence fragments
        - Skip sentences that appear to be cut off at the beginning (e.g., starting with lowercase, missing subject, or continuing from previous context with "und", "oder", "aber", "dass", etc.)
        - Skip sentences that appear to be cut off at the end (e.g., ending abruptly without proper punctuation like period, question mark, or exclamation mark)
        - Only include sentences that have both a clear beginning (typically starting with a capital letter and a subject/verb) and a clear ending (proper sentence-ending punctuation)
        - If the visible text in the selected area only shows a fragment of a sentence, do not include it
        - If there are no complete sentences in the selected area, respond with an empty "sentences" array. Do not fabricate sentences.""".formatted(languageLevel.name());

    final AreaSentences example = new AreaSentences(List.of(
        "Guten Morgen, wie geht es Ihnen?",
        "Ich fahre jeden Tag mit dem Bus zur Arbeit.",
        "Das Wetter ist heute sehr schön."));

    try {
      final String exampleJson = objectMapper.writeValueAsString(example);
      return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
    } catch (JsonProcessingException e) {
      throw new RuntimeException("Failed to serialize example to JSON", e);
    }
  }

  public List<String> getAreaSentences(byte[] imageData, ChatModel model, LanguageLevel languageLevel) {
    final var result = chatService.callWithLoggingAndMedia(
        model,
        OperationType.EXTRACTION,
        buildSystemPrompt(languageLevel),
        imageData,
        u -> u
            .text("Here is the image of the page")
            .media(Media.builder()
                .data(imageData)
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .build()),
        AreaSentences.class);

    return result.sentences;
  }
}
