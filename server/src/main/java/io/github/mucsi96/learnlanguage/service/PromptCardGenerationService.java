package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SimpleCardSuggestion;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class PromptCardGenerationService {

  record GeneratedCard(String frontText, String backText, String topic) {
  }

  record GeneratedCards(List<GeneratedCard> cards) {
  }

  private final JsonMapper jsonMapper;
  private final ChatService chatService;
  private final CardRepository cardRepository;
  private final ChatModelSettingService chatModelSettingService;

  public List<SimpleCardSuggestion> generateCards(
      Source source,
      String generationPrompt,
      int count) {

    final List<Card> existingCards = cardRepository.findBySource_IdIn(List.of(source.getId()));

    final GeneratedCards result = chatService.callWithLogging(
        chatModelSettingService.getPrimaryModel(OperationType.CARD_GENERATION),
        OperationType.CARD_GENERATION,
        buildSystemPrompt(source, existingCards, count),
        buildUserMessage(generationPrompt, count),
        GeneratedCards.class);

    return result.cards().stream()
        .map(card -> SimpleCardSuggestion.builder()
            .frontText(card.frontText())
            .backText(card.backText())
            .topic(normalize(card.topic()))
            .build())
        .toList();
  }

  private String buildSystemPrompt(Source source, List<Card> existingCards, int count) {
    final String existingSummary = existingCards.isEmpty()
        ? "There are no existing cards yet."
        : existingCards.stream()
            .map(Card::getData)
            .filter(data -> data != null && data.getFrontText() != null)
            .map(this::describeExistingCard)
            .collect(Collectors.joining("\n"));

    final String basePrompt = """
        You are an expert tutor building a spaced-repetition flashcard deck for a learner.

        Deck topic (base prompt):
        %s

        Your task:
        1. Infer the full curriculum of topics implied by the deck topic above (the areas an exam or
           exercise on this subject would cover).
        2. Generate exactly %d new, high-quality flashcards that best advance coverage of that curriculum.
           Prioritise topics that are NOT yet covered or are under-covered by the existing cards listed
           below. Do NOT duplicate existing cards.

        Card format:
        - "frontText": the question/prompt side, in GitHub-flavoured Markdown. Bullet lists are allowed.
        - "backText": the answer/explanation side, in GitHub-flavoured Markdown. Bullet lists are allowed.
        - "topic": a short topic label (a few words) naming the curriculum area this card belongs to.
          Reuse the exact same label for cards in the same area so coverage can be tracked.

        Rules:
        - Keep each card focused on a single fact, concept or skill.
        - Keep cards self-contained and unambiguous.
        - Respond ONLY with JSON of the form {"cards": [...]} matching the example shape below.

        Existing cards (frontText -> topic):
        %s
        """.formatted(
        source.getPrompt() != null ? source.getPrompt() : "",
        count,
        existingSummary);

    final GeneratedCards example = new GeneratedCards(List.of(
        new GeneratedCard(
            "What command creates a pod named `nginx` using the `nginx` image?",
            "```sh\nkubectl run nginx --image=nginx\n```",
            "Pods")));

    return basePrompt + "\nExample JSON response shape:\n" + jsonMapper.writeValueAsString(example);
  }

  private String describeExistingCard(CardData data) {
    final String topic = data.getTopic() != null ? data.getTopic() : "(untagged)";
    return "- " + data.getFrontText().replaceAll("\\s+", " ").trim() + " -> " + topic;
  }

  private String buildUserMessage(String generationPrompt, int count) {
    final String extra = generationPrompt != null && !generationPrompt.isBlank()
        ? "\nAdditional instructions for this batch: " + generationPrompt.trim()
        : "";
    return "Generate exactly %d new cards that improve coverage of the deck topic.%s".formatted(count, extra);
  }

  private String normalize(String value) {
    if (value == null) {
      return null;
    }
    final String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
