package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.ModelUsageLog;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ModelUsageLogController {

    private final ModelUsageLogRepository repository;

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @GetMapping("/model-usage-logs")
    public List<ModelUsageLog> getModelUsageLogs() {
        return repository.findAllByOrderByCreatedAtDesc();
    }
}
