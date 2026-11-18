package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.Builder;

public final class ContentModels {
    private ContentModels() {}

    public record ContentDescriptor(String externalId, String title, Integer number, Integer durationSeconds,
            String languageLevel, String audioUrl, String transcriptUrl, String transcriptMediaType, String matchError) {}
    public record VocabularyWord(
            @JsonPropertyDescription("German dictionary base form without article; masculine singular for paired person nouns.") String lemma,
            @JsonPropertyDescription("One of noun, verb, adjective, adverb, expression, or other.") String wordType,
            @JsonPropertyDescription("Nominative definite article for nouns; empty otherwise.") String article,
            @JsonPropertyDescription("Standard grammatical forms; empty when inapplicable.") List<String> forms,
            @JsonPropertyDescription("Verbatim sentences from the supplied story containing the word.") List<String> examples,
            @JsonPropertyDescription("Verbatim occurrences of the word in the supplied story.") List<String> surfaceForms) {
        public String cardWord() {
            if (!"noun".equalsIgnoreCase(wordType)) return lemma;
            if (article == null || !List.of("der", "die", "das").contains(article)) {
                throw new IllegalStateException("Noun is missing a valid definite article: " + lemma);
            }
            return article + " " + lemma;
        }
    }
    public record VocabularyResult(
            @JsonPropertyDescription("Distinct vocabulary worth learning from the story; empty if none qualifies.") List<VocabularyWord> words) {}
    @Builder(toBuilder = true)
    public record Preparation(String transcript, List<VocabularyWord> words,
            String model, String version) {}
    public record ContentItem(UUID id, String collectionPath, ContentDescriptor descriptor, Preparation preparation,
            String status, String error, UUID leaseToken) {}
    public record WordCoverage(String key, VocabularyWord word, String status, List<String> cardIds) {}
    public record Progress(double position, double duration, boolean completed) {}
    public record ContentView(UUID id, ContentDescriptor metadata, String status, String error,
            String transcript, List<WordCoverage> words, boolean unlocked, Progress progress) {}
    public record DraftRequest(List<String> wordKeys) {}
    public record Playback(UUID sessionId, String mediaUrl, String audioRevision, Progress progress) {}
    public record ProgressRequest(UUID sessionId, long sequence, double position, double duration, boolean completed) {}
}
