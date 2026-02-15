package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import io.github.mucsi96.learnlanguage.repository.CardViewRepository;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SourceService {

    private final SourceRepository sourceRepository;
    private final CardRepository cardRepository;
    private final CardViewRepository cardViewRepository;

    public List<Source> getAllSources() {
        return sourceRepository.findAllByOrderByIdAsc();
    }

    public Optional<Source> getSourceById(String id) {
        return sourceRepository.findById(id);
    }

    public Source saveSource(Source source) {
        return sourceRepository.save(source);
    }

    @Transactional
    public void deleteSource(Source source) {
        cardRepository.deleteBySource(source);
        sourceRepository.delete(source);
        cardViewRepository.refresh();
    }
}
