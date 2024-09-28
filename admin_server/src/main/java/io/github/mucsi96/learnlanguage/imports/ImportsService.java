package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImportsService {
    private final ImportsRepository importsRepository;

    public List<String> getCategories() {
        return importsRepository.findDistinctCategory();
    }

    List<Import> findAllByCategory(String category) {
        return importsRepository.findByCategory(category);
    }
}
