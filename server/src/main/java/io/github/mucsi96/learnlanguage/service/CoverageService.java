package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CoverageResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.TopicCoverage;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class CoverageService {

  record CoverageTopic(String topic, int cardCount, String status) {
  }

  record Coverage(List<CoverageTopic> topics) {
  }

  private final JsonMapper jsonMapper;
  private final ChatService chatService;
  private final CardRepository cardRepository;
  private final ChatModelSettingService chatModelSettingService;

  public CoverageResponse analyzeCoverage(Source source) {
    final List<Card> existingCards = cardRepository.findBySource_IdIn(List.of(source.getId()));

    final Coverage result = chatService.callWithLogging(
        chatModelSettingService.getPrimaryModel(OperationType.CARD_GENERATION),
        OperationType.CARD_GENERATION,
        buildSystemPrompt(source, existingCards),
        "Produce the coverage report for this deck.",
        Coverage.class);

    final List<TopicCoverage> topics = result.topics().stream()
        .map(topic -> TopicCoverage.builder()
            .topic(topic.topic())
            .cardCount(topic.cardCount())
            .status(topic.status())
            .build())
        .toList();

    return CoverageResponse.builder().topics(topics).build();
  }

  private String buildSystemPrompt(Source source, List<Card> existingCards) {
    final String existingSummary = existingCards.isEmpty()
        ? "There are no existing cards yet."
        : existingCards.stream()
            .map(Card::getData)
            .filter(data -> data != null && data.getFrontText() != null)
            .map(this::describeExistingCard)
            .collect(Collectors.joining("\n"));

    final String basePrompt = """
        You are an expert tutor analysing how well a spaced-repetition flashcard deck covers its subject.

        Deck topic (base prompt):
        %s

        Your task:
        1. Infer the full curriculum of topics implied by the deck topic above (the areas an exam or
           exercise on this subject would cover). Keep the list focused - typically 5 to 15 areas.
        2. For each curriculum topic, count how many of the existing cards below belong to it (match on
           meaning, not only on the literal topic label) and assign a coverage status:
           - "none": no cards cover this topic
           - "low": some cards but the topic is under-covered
           - "good": the topic is well covered
        3. Order topics from least to best covered so gaps appear first.

        Respond ONLY with JSON of the form {"topics": [...]} matching the example shape below.

        Existing cards (frontText -> topic):
        %s
        """.formatted(
        source.getPrompt() != null ? source.getPrompt() : "",
        existingSummary);

    final Coverage example = new Coverage(List.of(
        new CoverageTopic("Services & Networking", 0, "none"),
        new CoverageTopic("Pods", 3, "good")));

    return basePrompt + "\nExample JSON response shape:\n" + jsonMapper.writeValueAsString(example);
  }

  private String describeExistingCard(CardData data) {
    final String topic = data.getTopic() != null ? data.getTopic() : "(untagged)";
    return "- " + data.getFrontText().replaceAll("\\s+", " ").trim() + " -> " + topic;
  }
}
