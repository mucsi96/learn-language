package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImportsService {
    private final ImportsRepository importsRepository;

    public List<String> getCategories() {
        return importsRepository.findDistinctCategory();
    }

    List<Import> find(String category, int limit) {
        return importsRepository.findByCategoryOrderByIdAsc(category,
                PageRequest.of(0, limit));
    }

    List<Import> findAfterId(String category, Long afterId, int limit) {
        return importsRepository.findByCategoryAndIdGreaterThanOrderByIdAsc(category, afterId,
                PageRequest.of(0, limit));
    }
}
