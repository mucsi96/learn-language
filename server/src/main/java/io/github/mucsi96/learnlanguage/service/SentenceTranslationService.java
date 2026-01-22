package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SentenceTranslationService {

  record SentenceTranslationResponse(String translation) {
  }

  private final ChatService chatService;

  public String translateToHungarian(String germanSentence, ChatModel model) {
    final String systemPrompt = """
        You are a Hungarian language expert.
        Your task is to translate the given German sentence to Hungarian.
        Provide an accurate translation that captures the meaning and context.
        Respond with a JSON object containing a single "translation" field with the Hungarian translation.""";

    final var result = chatService.callWithLogging(
        model,
        "translation",
        systemPrompt,
        germanSentence,
        SentenceTranslationResponse.class);

    return result.translation;
  }

  public String translateToEnglish(String germanSentence, ChatModel model) {
    final String systemPrompt = """
        You are an English language expert.
        Your task is to translate the given German sentence to English.
        Provide an accurate translation that captures the meaning and context.
        Respond with a JSON object containing a single "translation" field with the English translation.""";

    final var result = chatService.callWithLogging(
        model,
        "translation",
        systemPrompt,
        germanSentence,
        SentenceTranslationResponse.class);

    return result.translation;
  }
}
