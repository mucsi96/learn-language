package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.exception.ResourceNotFoundException;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SourceService {

    private final SourceRepository sourceRepository;
    private final CardRepository cardRepository;

    public List<Source> getAllSources() {
        return sourceRepository.findAllByOrderByIdAsc();
    }

    public Optional<Source> getSourceById(String id) {
        return sourceRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Set<String> getDetectionSourceIds(String sourceId) {
        final Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Source not found with id: " + sourceId));
        return Stream.concat(
                Stream.of(sourceId),
                source.getDetectionSources().stream().map(Source::getId))
                .collect(Collectors.toUnmodifiableSet());
    }

    public Source saveSource(Source source) {
        return sourceRepository.save(source);
    }

    @Transactional
    public void deleteSource(Source source) {
        cardRepository.deleteBySource(source);
        sourceRepository.delete(source);
    }
}
