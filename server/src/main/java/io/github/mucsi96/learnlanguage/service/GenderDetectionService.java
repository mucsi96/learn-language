package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GenderDetectionService {

  private static final String SYSTEM_PROMPT = """
      You are a German language expert.
      Your task is to determine the gender of the given German noun.
      Return the grammatical gender in capitalized form: MASCULINE, FEMININE, or NEUTER.
      """;

  private final ChatService chatService;

  record GenderResult(String gender) {
  }

  public String detectGender(String noun, ChatModel model) {
    var result = chatService.callWithLogging(
        model,
        OperationType.CLASSIFICATION,
        SYSTEM_PROMPT,
        "The noun is: %s.".formatted(noun),
        GenderResult.class);

    return result.gender();
  }
}
