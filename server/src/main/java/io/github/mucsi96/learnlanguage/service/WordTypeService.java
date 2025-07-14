package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  static record WordTypeResult(String type) {
  }

  private final OpenAIClient openAIClient;

  public String detectWordType(String word) {
    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(
            """
                You are a linguistic expert.
                Your task is to categorize the given german word.
                You should ignore any articles or prefixes and focus on the core meaning of the word.
                The possible categories are:
                - VERB
                - ADJECTIVE
                - ADVERB
                - PRONOUN
                - PREPOSITION
                - CONJUNCTION
                - INTERJECTION
                - ARTICLE
                - NUMERAL
                - DETERMINER
                - NOUN
                Do not include any additional text or explanations, just the JSON response.
                Example of the expected JSON response:
                {
                    "type": "NOUN"
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
