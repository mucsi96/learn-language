package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

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
    public List<Import> listImports(@RequestParam String category) {
        return importService.findAllByCategory(category);
    }

}
