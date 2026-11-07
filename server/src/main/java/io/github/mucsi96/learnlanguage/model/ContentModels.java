package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.UUID;
import lombok.Builder;

public final class ContentModels {
    private ContentModels() {}

    public record ContentDescriptor(String externalId, String title, Integer number, Integer durationSeconds,
            String languageLevel, String audioUrl, String transcriptUrl, String transcriptMediaType, String matchError) {}
    public record VocabularyWord(String lemma, String wordType, String article, List<String> forms,
            List<String> examples, List<String> surfaceForms) {
        public String cardWord() {
            if (!"noun".equalsIgnoreCase(wordType)) return lemma;
            if (article == null || !List.of("der", "die", "das").contains(article)) {
                throw new IllegalStateException("Noun is missing a valid definite article: " + lemma);
            }
            return article + " " + lemma;
        }
    }
    public record VocabularyResult(List<VocabularyWord> words) {}
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
