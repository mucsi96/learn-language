package io.github.mucsi96.learnlanguage.imports;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImportsService {
    private final ImportsRepository importsRepository;

    Page<Import> listImports(int page, int size) {
        return importsRepository.findAll(PageRequest.of(page, size));
    }
}
