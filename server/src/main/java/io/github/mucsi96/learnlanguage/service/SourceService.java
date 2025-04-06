package io.github.mucsi96.learnlanguage.service;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.repository.SourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SourceService {

    private final SourceRepository sourceRepository;

    public List<Source> getAllSources() {
        return sourceRepository.findAllByOrderByIdAsc();
    }

    public Optional<Source> getSourceById(String id) {
        return sourceRepository.findById(id);
    }
}
