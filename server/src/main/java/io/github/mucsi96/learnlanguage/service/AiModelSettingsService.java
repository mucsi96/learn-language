package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.AiModelSettings;
import io.github.mucsi96.learnlanguage.model.AiModelSettingsResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.repository.AiModelSettingsRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AiModelSettingsService {

    private final AiModelSettingsRepository repository;

    public List<AiModelSettingsResponse> getAllSettings() {
        List<AiModelSettings> allSettings = repository.findAll();

        Map<String, Set<String>> enabledModelsMap = allSettings.stream()
                .filter(AiModelSettings::getIsEnabled)
                .collect(Collectors.groupingBy(
                        AiModelSettings::getOperationType,
                        Collectors.mapping(AiModelSettings::getModelName, Collectors.toSet())));

        return Arrays.stream(OperationType.values())
                .map(opType -> {
                    Set<String> enabledModels = enabledModelsMap.getOrDefault(opType.getCode(), Set.of());

                    List<AiModelSettingsResponse.ModelSetting> models = Arrays.stream(ChatModel.values())
                            .map(chatModel -> AiModelSettingsResponse.ModelSetting.builder()
                                    .modelName(chatModel.getModelName())
                                    .isEnabled(enabledModels.contains(chatModel.getModelName()))
                                    .build())
                            .toList();

                    return AiModelSettingsResponse.builder()
                            .operationType(opType.getCode())
                            .operationDisplayName(opType.getDisplayName())
                            .models(models)
                            .build();
                })
                .toList();
    }

    @Transactional
    public void updateSetting(String operationType, String modelName, boolean isEnabled) {
        OperationType.fromCode(operationType);
        ChatModel.fromString(modelName);

        repository.findByOperationTypeAndModelName(operationType, modelName)
                .ifPresentOrElse(
                        existing -> {
                            existing.setIsEnabled(isEnabled);
                            repository.save(existing);
                        },
                        () -> {
                            AiModelSettings settings = AiModelSettings.builder()
                                    .operationType(operationType)
                                    .modelName(modelName)
                                    .isEnabled(isEnabled)
                                    .build();
                            repository.save(settings);
                        });
    }
}
