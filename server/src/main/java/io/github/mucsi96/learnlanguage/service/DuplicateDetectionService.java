package io.github.mucsi96.learnlanguage.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DuplicateDetectionResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class DuplicateDetectionService {

    private static final int PREFIX_LENGTH = 2;

    private static final String SYSTEM_PROMPT = """
            You are a language learning duplicate detection assistant.
            Each card in our flashcard system has an ID with the format `<germanWord>-<hungarianTranslation>`.
            Both parts are normalized: lowercased, articles stripped, diacritics removed, spaces replaced with hyphens.
            For example, the German noun "das Auto" with Hungarian translation "az autó" becomes the ID "auto-auto".
            The verb "abfahren" translated as "elindulni" becomes "abfahren-elindulni".

            You will receive two arrays of IDs:
            - "existingIds": IDs of cards already created in the system. These are pre-filtered to share the first %d letters of the German word with at least one of the new IDs.
            - "newIds": IDs of new cards the user wants to create.

            Your task is to find pairs where a new ID is likely a SEMANTIC duplicate of an existing ID.
            An exact ID match is NOT a duplicate to flag - those are filtered out elsewhere. Focus on near-duplicates such as:
            - Same German word with different Hungarian translation that means the same thing (e.g. synonyms, alternative wordings).
            - Different German words that share the same Hungarian translation and likely refer to the same concept (e.g. "wagen-auto" vs "auto-auto" - both translate "car").
            - Inflected variants or compounds that closely overlap with an existing card.

            Be conservative. Only report a duplicate if you are reasonably confident the user might want to skip the new card because the concept is already covered.
            Do NOT report a new ID that has no related existing ID.

            Respond with JSON of the form:
            {
              "duplicates": [
                { "newId": "...", "existingId": "...", "reason": "<short explanation in English>" }
              ]
            }
            If a new ID appears similar to multiple existing IDs, emit one entry per pair.
            If there are no potential duplicates, return an empty array.
            """.formatted(PREFIX_LENGTH);

    private final ChatService chatService;
    private final CardRepository cardRepository;
    private final JsonMapper jsonMapper;

    public DuplicateDetectionResponse detectDuplicates(List<String> newIds, Collection<String> detectionSourceIds,
            ChatModel model) {
        if (newIds == null || newIds.isEmpty()) {
            return DuplicateDetectionResponse.builder().duplicates(List.of()).build();
        }

        final Set<String> newIdPrefixes = newIds.stream()
                .map(DuplicateDetectionService::prefixOf)
                .filter(prefix -> !prefix.isEmpty())
                .collect(Collectors.toUnmodifiableSet());

        if (newIdPrefixes.isEmpty()) {
            return DuplicateDetectionResponse.builder().duplicates(List.of()).build();
        }

        final List<String> existingIds = cardRepository.findBySource_IdIn(detectionSourceIds).stream()
                .map(Card::getId)
                .filter(id -> newIdPrefixes.contains(prefixOf(id)))
                .toList();

        if (existingIds.isEmpty()) {
            return DuplicateDetectionResponse.builder().duplicates(List.of()).build();
        }

        final String userMessage = jsonMapper.writeValueAsString(Map.of(
                "existingIds", existingIds,
                "newIds", newIds));

        return chatService.callWithLogging(
                model,
                OperationType.DUPLICATE_DETECTION,
                SYSTEM_PROMPT,
                userMessage,
                DuplicateDetectionResponse.class);
    }

    private static String prefixOf(String id) {
        if (id == null || id.isEmpty()) {
            return "";
        }
        return id.substring(0, Math.min(PREFIX_LENGTH, id.length()));
    }
}
