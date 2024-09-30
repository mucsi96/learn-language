package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ImportsController {
    private final ImportsService importService;

    @GetMapping("/api/import/categories")
    public List<String> getCategories() {
        return importService.getCategories();
    }

    @GetMapping("/api/imports")
    public Page<List<Import>> listImports(@RequestParam String category,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam int limit) {
        return importService.getImportsPage(category, page, limit);
    }

}
