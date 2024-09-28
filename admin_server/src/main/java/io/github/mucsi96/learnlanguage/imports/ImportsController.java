package io.github.mucsi96.learnlanguage.imports;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ImportsController {
    private final ImportsService decksService;

    @GetMapping("/api/imports")
    public List<Import> listImports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return decksService.listImports(page, size).toList();
    }

}
