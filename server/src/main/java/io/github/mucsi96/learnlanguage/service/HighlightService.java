package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Highlight;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.HighlightResponse;
import io.github.mucsi96.learnlanguage.repository.HighlightRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HighlightService {

    private final HighlightRepository highlightRepository;

    public List<HighlightResponse> getHighlightsBySource(Source source) {
        return highlightRepository.findBySourceOrderByCreatedAtDesc(source).stream()
                .map(h -> HighlightResponse.of(
                        h.getId(),
                        h.getHighlightedWord(),
                        h.getSentence(),
                        h.getCreatedAt()))
                .toList();
    }

    public void persistHighlight(Source source, String highlightedWord, String sentence) {
        if (highlightRepository.existsBySourceAndHighlightedWordAndSentence(
                source, highlightedWord, sentence)) {
            return;
        }

        final Highlight highlight = Highlight.builder()
                .source(source)
                .highlightedWord(highlightedWord)
                .sentence(sentence)
                .createdAt(LocalDateTime.now())
                .build();
        highlightRepository.save(highlight);
    }
}
