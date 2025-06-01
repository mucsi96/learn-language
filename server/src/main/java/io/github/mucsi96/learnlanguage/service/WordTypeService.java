package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  static record WordTypeResult(String word, String type) {
  }

  private final OpenAIClient openAIClient;

  public String detectWordType(String word) {
    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(
            """
                You are a linguistic expert.
                Your task is to determine the type of the given word (e.g., noun, verb, adjective) and reply in hungarian.
                !IMPORTANT! Please provide the word type in the following JSON structure:
                {
                    \"word\": \"apple\",
                    \"type\": \"noun\"
                }
                """)
        .addUserMessage("The word is: %s.".formatted(word))
        .responseFormat(WordTypeResult.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return result.type();
  }
}
