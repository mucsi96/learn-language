package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.data.domain.Page;
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

    Page<List<Import>> getImportsPage(String category, int page, int limit) {
        return importsRepository.findByCategoryOrderByIdAsc(category, PageRequest.of(page, limit));
    }
}
