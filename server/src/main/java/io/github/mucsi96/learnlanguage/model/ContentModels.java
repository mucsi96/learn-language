package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import java.util.UUID;
import lombok.Builder;

public final class ContentModels {
    private ContentModels() {}

    public record ExtensionDescriptor(String id, String name, String itemLabel, List<String> capabilities) {}
    public record ContentDescriptor(String externalId, String title, Integer number, Integer durationSeconds,
            String languageLevel, String audioUrl, String transcriptUrl, String transcriptMediaType, String matchError,
            String youtubeVideoId) {}
    public record ResolvedTranscript(String isolatedText, String url, String mediaType) {}
    public record SourceStoryLink(String title, String url) {}
    public record SourceIndexExtraction(boolean complete, List<SourceStoryLink> stories) {}
    public record SourceStoryExtraction(boolean complete, List<String> paragraphs) {}
    public record StoryRecording(String title, String transcriptTitle, String videoId, int number, int durationSeconds,
            String transcriptIssue) {}
    public record IsolationPolicy(List<String> excludedSectionHeadings, String lineNumberPattern) {}
    public record TextBlock(String id, int page, String text) {}
    public record IsolationResult(boolean titleMatches, List<String> storyBlockIds) {}
    public record VocabularyWord(String lemma, String wordType, String article, List<String> forms,
            List<String> examples, List<String> surfaceForms) {}
    public record VocabularyResult(List<VocabularyWord> words) {}
    @Builder(toBuilder = true)
    public record Preparation(List<TextBlock> blocks, String transcript, List<VocabularyWord> words,
            String model, String version) {}
    public record ContentItem(UUID id, String extensionId, ContentDescriptor descriptor, Preparation preparation,
            String status, String error, UUID leaseToken) {}
    public record WordCoverage(String key, VocabularyWord word, String status, List<String> cardIds) {}
    public record Progress(double position, double duration, boolean completed) {}
    public record ContentView(UUID id, ContentDescriptor metadata, String status, String error,
            String transcript, List<WordCoverage> words, boolean unlocked, Progress progress) {}
    public record DraftRequest(List<String> wordKeys) {}
    public record Playback(UUID sessionId, String kind, String mediaUrl, String youtubeVideoId, String audioRevision, Progress progress) {}
    public record ProgressRequest(UUID sessionId, long sequence, double position, double duration, boolean completed) {}
}
