package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ChatModelSettingRequest;
import io.github.mucsi96.learnlanguage.model.ChatModelSettingResponse;
import io.github.mucsi96.learnlanguage.repository.ChatModelSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatModelSettingService {

    private final ChatModelSettingRepository chatModelSettingRepository;

    public List<ChatModelSettingResponse> getAllSettings() {
        return chatModelSettingRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ChatModelSettingResponse> getEnabledSettings() {
        return chatModelSettingRepository.findByIsEnabledTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<String> getEnabledModelsForOperation(String operationType) {
        return chatModelSettingRepository.findByOperationTypeAndIsEnabledTrue(operationType).stream()
                .map(ChatModelSetting::getModelName)
                .toList();
    }

    public Map<String, List<String>> getEnabledModelsByOperation() {
        List<ChatModelSetting> enabledSettings = chatModelSettingRepository.findByIsEnabledTrue();

        return enabledSettings.stream()
                .collect(Collectors.groupingBy(
                        ChatModelSetting::getOperationType,
                        Collectors.mapping(ChatModelSetting::getModelName, Collectors.toList())
                ));
    }

    public Map<String, String> getPrimaryModelByOperation() {
        List<ChatModelSetting> primarySettings = chatModelSettingRepository.findByIsPrimaryTrue();

        return primarySettings.stream()
                .collect(Collectors.toMap(
                        ChatModelSetting::getOperationType,
                        ChatModelSetting::getModelName,
                        (existing, replacement) -> existing
                ));
    }

    public ChatModelSettingResponse updateSetting(ChatModelSettingRequest request) {
        ChatModelSetting setting = chatModelSettingRepository
                .findByModelNameAndOperationType(request.getModelName(), request.getOperationType())
                .orElseGet(() -> ChatModelSetting.builder()
                        .modelName(request.getModelName())
                        .operationType(request.getOperationType())
                        .build());

        setting.setIsEnabled(request.getIsEnabled());

        if (Boolean.TRUE.equals(request.getIsPrimary())) {
            clearPrimaryForOperation(request.getOperationType());
            setting.setIsPrimary(true);
        } else if (request.getIsPrimary() != null) {
            setting.setIsPrimary(false);
        }

        return toResponse(chatModelSettingRepository.save(setting));
    }

    private void clearPrimaryForOperation(String operationType) {
        List<ChatModelSetting> settings = chatModelSettingRepository.findByOperationType(operationType);
        for (ChatModelSetting s : settings) {
            if (Boolean.TRUE.equals(s.getIsPrimary())) {
                s.setIsPrimary(false);
                chatModelSettingRepository.save(s);
            }
        }
    }

    public void enableAllModelsForOperation(String operationType) {
        Set<String> existingModels = chatModelSettingRepository.findByOperationType(operationType).stream()
                .map(ChatModelSetting::getModelName)
                .collect(Collectors.toSet());

        List<ChatModelSetting> settingsToSave = Arrays.stream(ChatModel.values())
                .map(model -> {
                    if (existingModels.contains(model.getModelName())) {
                        ChatModelSetting existing = chatModelSettingRepository
                                .findByModelNameAndOperationType(model.getModelName(), operationType)
                                .orElseThrow();
                        existing.setIsEnabled(true);
                        return existing;
                    } else {
                        return ChatModelSetting.builder()
                                .modelName(model.getModelName())
                                .operationType(operationType)
                                .isEnabled(true)
                                .build();
                    }
                })
                .toList();

        chatModelSettingRepository.saveAll(settingsToSave);
    }

    private ChatModelSettingResponse toResponse(ChatModelSetting setting) {
        return ChatModelSettingResponse.builder()
                .id(setting.getId())
                .modelName(setting.getModelName())
                .operationType(setting.getOperationType())
                .isEnabled(setting.getIsEnabled())
                .isPrimary(setting.getIsPrimary())
                .build();
    }
}
