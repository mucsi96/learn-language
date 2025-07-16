package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GenderDetectionService {

  static record GenderResult(String gender) {
  }

  private final OpenAIClient openAIClient;

  public String detectGender(String noun) {
    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(
            """
                You are a German language expert.
                Your task is to determine the gender of the given German noun.
                Return the grammatical gender in capitalized form: MASCULINE, FEMININE, or NEUTER.
                Do not include any additional text or explanations, just the JSON response.
                Example of the expected JSON response:
                {
                    "gender": "MASCULINE"
                }
                """)
        .addUserMessage("The noun is: %s.".formatted(noun))
        .responseFormat(GenderResult.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return result.gender();
  }
}
