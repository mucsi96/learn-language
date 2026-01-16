package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
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
        Do not include partial sentences or sentence fragments.""".formatted(languageLevel.name());

    final AreaSentences example = new AreaSentences(List.of(
        "Guten Morgen, wie geht es Ihnen?",
        "Ich fahre jeden Tag mit dem Bus zur Arbeit.",
        "Das Wetter ist heute sehr schön."));

    try {
      final String exampleJson = objectMapper.writeValueAsString(example);
      return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize example to JSON", e);
    }
  }

  public List<String> getAreaSentences(byte[] imageData, ChatModel model, LanguageLevel languageLevel) {
    final var result = chatService.callWithLoggingAndMedia(
        model,
        "sentence_extraction",
        buildSystemPrompt(languageLevel),
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
