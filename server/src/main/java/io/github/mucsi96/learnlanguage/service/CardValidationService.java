package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import io.github.mucsi96.learnlanguage.model.ValidationData;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CardValidationService {

  static record ValidationResult(String gender, List<String> forms, String extractedWord) {
  }

  private final OpenAIClient openAIClient;

  public ValidationData validateCard(String pdfText, String wordType) {
    var systemPrompt = buildSystemPrompt(wordType);

    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(systemPrompt)
        .addUserMessage("The text from PDF is: %s".formatted(pdfText))
        .responseFormat(ValidationResult.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return ValidationData.builder()
        .suggestedGender(result.gender())
        .suggestedForms(result.forms())
        .extractedText(result.extractedWord())
        .build();
  }

  private String buildSystemPrompt(String wordType) {
    if ("NOUN".equals(wordType)) {
      return """
          You are a German language expert.
          Your task is to analyze the given text from a PDF and extract grammatical information about a German noun.

          Extract:
          1. The article (der, die, das) - return the grammatical gender: MASCULINE, FEMININE, or NEUTER
          2. The plural form (if present in the text)
          3. The base noun without article

          Return the results in JSON format:
          {
              "gender": "MASCULINE|FEMININE|NEUTER",
              "forms": ["plural form"],
              "extractedWord": "the noun without article"
          }

          If no plural form is present in the text, return an empty array for forms.
          If no article is present, use null for gender.

          Example input: "der Tisch, die Tische"
          Example output:
          {
              "gender": "MASCULINE",
              "forms": ["die Tische"],
              "extractedWord": "Tisch"
          }
          """;
    } else if ("VERB".equals(wordType)) {
      return """
          You are a German language expert.
          Your task is to analyze the given text from a PDF and extract grammatical information about a German verb.

          Extract:
          1. The base verb (infinitive form)
          2. All conjugated forms present in the text (Präsens, Präteritum, Perfekt, etc.)

          Return the results in JSON format:
          {
              "gender": null,
              "forms": ["conjugated form 1", "conjugated form 2", ...],
              "extractedWord": "infinitive form"
          }

          Example input: "gehen, ging, gegangen"
          Example output:
          {
              "gender": null,
              "forms": ["ging", "gegangen"],
              "extractedWord": "gehen"
          }
          """;
    } else {
      return """
          You are a German language expert.
          Your task is to analyze the given text from a PDF and extract the word.

          Return the results in JSON format:
          {
              "gender": null,
              "forms": [],
              "extractedWord": "the word from the text"
          }
          """;
    }
  }
}
