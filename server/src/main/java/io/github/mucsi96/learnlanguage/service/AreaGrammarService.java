package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaGrammarService {

  record AreaSentences(List<String> sentences) {
  }

  private final JsonMapper jsonMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    final String basePrompt = """
        You are a linguistic expert specializing in German grammar exercises.
        Your task is to extract German sentences from the provided page image that can be used for grammar practice (fill-in-the-blank exercises).
        These sentences will be used for grammar practice where learners need to fill in missing parts.

        !IMPORTANT! In response please provide all extracted sentences in JSON format with a "sentences" array.
        Extract complete, meaningful sentences that are suitable for %s level learners.
        Each sentence should be a standalone German sentence that makes sense on its own.

        Rules for extraction (!IMPORTANT! please follow these carefully):
        - If a sentence has printed placeholders (like "___", "...", or blank lines), identify what text should fill them and wrap the filled text in square brackets
        - Use AI knowledge to correctly fill in any blanks/placeholders based on German grammar rules
        - Mark gaps by wrapping the filled-in words with square brackets, e.g. "Und [das] ist Frau Muller."
        - SKIP any handwritten text (text that appears to be written by hand/pencil)
        - SKIP partial sentences or sentence fragments
        - Only include sentences that have proper beginning and ending punctuation
        - If no gaps are visible in a sentence, still extract it without any brackets - gaps can be added later during editing
        - Skip sentences that appear to be cut off at the end (e.g., ending abruptly without proper punctuation like period, question mark, or exclamation mark)
        - Only include sentences that have both a clear beginning (typically starting with a capital letter and a subject/verb) and a clear ending (proper sentence-ending punctuation)
        - If there are no suitable sentences in the selected area, respond with an empty "sentences" array. Do not fabricate sentences.""".formatted(languageLevel.name());

    final AreaSentences example = new AreaSentences(List.of(
        "Ich gehe jeden [Tag] in die Schule.",
        "Der Hund [läuft] schnell durch [den] Park."));

    final String exampleJson = jsonMapper.writeValueAsString(example);
    return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
  }

  public List<String> getAreaGrammarSentences(byte[] imageData, ChatModel model, LanguageLevel languageLevel) {
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
