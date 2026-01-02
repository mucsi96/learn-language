package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.AiModelSettings;
import io.github.mucsi96.learnlanguage.model.AiModelSettingsResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.OperationTypeResponse;
import io.github.mucsi96.learnlanguage.repository.AiModelSettingsRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AiModelSettingsService {

    private final AiModelSettingsRepository repository;

    public List<AiModelSettingsResponse> getAllSettings() {
        Map<String, AiModelSettings> settingsMap = repository.findAll().stream()
                .collect(Collectors.toMap(AiModelSettings::getOperationType, Function.identity()));

        return Arrays.stream(OperationType.values())
                .map(opType -> {
                    AiModelSettings settings = settingsMap.get(opType.getCode());
                    return AiModelSettingsResponse.builder()
                            .id(settings != null ? settings.getId() : null)
                            .operationType(opType.getCode())
                            .operationDisplayName(opType.getDisplayName())
                            .modelType(opType.getModelType())
                            .modelName(settings != null ? settings.getModelName() : null)
                            .updatedAt(settings != null ? settings.getUpdatedAt() : null)
                            .build();
                })
                .toList();
    }

    public List<OperationTypeResponse> getOperationTypes() {
        return Arrays.stream(OperationType.values())
                .map(opType -> OperationTypeResponse.builder()
                        .code(opType.getCode())
                        .displayName(opType.getDisplayName())
                        .modelType(opType.getModelType())
                        .build())
                .toList();
    }

    public Optional<String> getModelForOperation(String operationType) {
        return repository.findByOperationType(operationType)
                .map(AiModelSettings::getModelName);
    }

    public Optional<String> getModelForOperation(OperationType operationType) {
        return getModelForOperation(operationType.getCode());
    }

    @Transactional
    public AiModelSettingsResponse updateSetting(String operationType, String modelName) {
        OperationType opType = OperationType.fromCode(operationType);

        Optional<AiModelSettings> existing = repository.findByOperationType(operationType);

        AiModelSettings settings;
        if (existing.isPresent()) {
            settings = existing.get();
            settings.setModelName(modelName);
            settings.setUpdatedAt(LocalDateTime.now());
        } else {
            settings = AiModelSettings.builder()
                    .operationType(operationType)
                    .modelType(opType.getModelType())
                    .modelName(modelName)
                    .updatedAt(LocalDateTime.now())
                    .build();
        }

        AiModelSettings saved = repository.save(settings);

        return AiModelSettingsResponse.builder()
                .id(saved.getId())
                .operationType(opType.getCode())
                .operationDisplayName(opType.getDisplayName())
                .modelType(opType.getModelType())
                .modelName(saved.getModelName())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Transactional
    public void deleteSetting(String operationType) {
        repository.findByOperationType(operationType)
                .ifPresent(repository::delete);
    }
}
