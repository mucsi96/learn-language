package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaWordsService {

  record ExtractedWord(String word, List<String> forms, List<String> examples) {
  }

  record ExtractedWordList(List<ExtractedWord> wordList) {
  }

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(SourceFormatType formatType, LanguageLevel languageLevel) {
    String basePrompt = """
        You are a linguistic expert.
        You task is to extract the wordlist data from provided page image.
        !IMPORTANT! In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
        The word property holds a string. it's the basic form of the word without any forms.""";

    String formsPrompt = switch (formatType) {
      case WORD_LIST_WITH_FORMS_AND_EXAMPLES -> """
        The forms is a string array representing the different forms extracted from the document.
        Rules for generating forms:
        - In case of a noun generate the plural form from suggestion. For example if the word is written like "das Angebot, -e" then the plural form is "die Angebote". Or if the word is written like "der Aufzug, -ü, e" then the plural form is "die Aufzüge". Also if the word is written like "der Koffer, –" then the plural form is "die Koffer".
        - In case of verb it's the 3 forms of conjugation (3. Person Singular Präsens, 3. Person Singular Präteritum and 3. Person Singular Perfekt). Do NOT include pronouns (Du, Er/Sie/Es, etc.) - only the verb forms themselves (e.g. for aufnehmen the forms are "nimmt auf", "nahm auf", "hat aufgenommen").
        - For other word types, leave the forms array empty.""";
      case null, default -> """
        The forms is a string array representing the different forms. Since the document does not contain word forms, you must generate them.
        Rules for generating forms:
        - In case of a noun generate the plural form from suggestion. For example if the word is written like "das Angebot, -e" then the plural form is "die Angebote". Or if the word is written like "der Aufzug, -ü, e" then the plural form is "die Aufzüge". Also if the word is written like "der Koffer, –" then the plural form is "die Koffer".
        - In case of verb generate the 3 forms of conjugation (3. Person Singular Präsens, 3. Person Singular Präteritum and 3. Person Singular Perfekt). Do NOT include pronouns (Du, Er/Sie/Es, etc.) - only the verb forms themselves (e.g. for aufnehmen the forms are "nimmt auf", "nahm auf", "hat aufgenommen").
        - For other word types, leave the forms array empty.""";
    };

    String examplesPrompt = switch (formatType) {
      case WORD_LIST_WITH_EXAMPLES, WORD_LIST_WITH_FORMS_AND_EXAMPLES -> """
          The examples property is a string array enlisting the examples provided in the document. Do not generate any additional examples, only extract the ones provided in the document.""";
      case null, default -> """

          The examples property is a string array. Since the document is flowing text without explicit examples, you must generate one context-relevant example sentence for each word that demonstrates its meaning and usage. The generated examples must be appropriate for %s level learners - use vocabulary and grammar structures suitable for this proficiency level."""
          .formatted(languageLevel.name());
    };

    ExtractedWordList example = new ExtractedWordList(List.of(
        new ExtractedWord("das Haus", List.of("die Häuser"), List.of("Das Haus ist groß.")),
        new ExtractedWord("gehen", List.of("gehst", "geht", "ist gegangen"),
            List.of("Ich gehe jetzt.", "Er ist nach Hause gegangen."))));

    try {
      String exampleJson = objectMapper.writeValueAsString(example);
      return basePrompt + formsPrompt + examplesPrompt + "\nExample of the expected JSON response:\n" + exampleJson;
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize example to JSON", e);
    }
  }

  public List<WordResponse> getAreaWords(byte[] imageData, ChatModel model, SourceFormatType formatType,
      LanguageLevel languageLevel) {
    final var result = chatService.callWithLoggingAndMedia(
        model,
        OperationType.EXTRACTION,
        buildSystemPrompt(formatType, languageLevel),
        imageData,
        u -> u
            .text("Here is the image of the page")
            .media(Media.builder()
                .data(imageData)
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .build()),
        ExtractedWordList.class);

    return result.wordList.stream()
        .map(extracted -> WordResponse.builder()
            .word(extracted.word())
            .forms(extracted.forms())
            .examples(extracted.examples())
            .build())
        .toList();
  }
}
