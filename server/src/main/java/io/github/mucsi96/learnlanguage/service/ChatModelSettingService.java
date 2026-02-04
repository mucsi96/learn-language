package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.ChatModelSetting;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ChatModelSettingRequest;
import io.github.mucsi96.learnlanguage.model.ChatModelSettingResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
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

    public List<String> getEnabledModelsForOperation(OperationType operationType) {
        return chatModelSettingRepository.findByOperationTypeAndIsEnabledTrue(operationType).stream()
                .map(ChatModelSetting::getModelName)
                .toList();
    }

    public Map<OperationType, List<String>> getEnabledModelsByOperation() {
        List<ChatModelSetting> enabledSettings = chatModelSettingRepository.findByIsEnabledTrue();

        return enabledSettings.stream()
                .collect(Collectors.groupingBy(
                        ChatModelSetting::getOperationType,
                        Collectors.mapping(ChatModelSetting::getModelName, Collectors.toList())
                ));
    }

    public Map<OperationType, String> getPrimaryModelByOperation() {
        List<ChatModelSetting> primarySettings = chatModelSettingRepository.findByIsPrimaryTrue();

        return primarySettings.stream()
                .collect(Collectors.toMap(
                        ChatModelSetting::getOperationType,
                        ChatModelSetting::getModelName,
                        (existing, replacement) -> existing
                ));
    }

    @Transactional
    public ChatModelSettingResponse updateSetting(ChatModelSettingRequest request) {
        final boolean newIsEnabled = Boolean.TRUE.equals(request.getIsEnabled());
        final boolean newIsPrimary = Boolean.TRUE.equals(request.getIsPrimary());

        return chatModelSettingRepository
                .findByModelNameAndOperationType(request.getModelName(), request.getOperationType())
                .map(setting -> {
                    if (!newIsEnabled && !newIsPrimary) {
                        chatModelSettingRepository.delete(setting);
                        return toResponse(setting);
                    }

                    if (newIsPrimary) {
                        clearPrimaryForOperation(request.getOperationType());
                    }
                    final boolean updatedIsPrimary = newIsPrimary
                            || (request.getIsPrimary() == null && Boolean.TRUE.equals(setting.getIsPrimary()));
                    final ChatModelSetting updatedSetting = setting.toBuilder()
                            .isEnabled(newIsEnabled)
                            .isPrimary(updatedIsPrimary)
                            .build();

                    return toResponse(chatModelSettingRepository.save(updatedSetting));
                })
                .orElseGet(() -> {
                    if (!newIsEnabled && !newIsPrimary) {
                        return ChatModelSettingResponse.builder()
                                .modelName(request.getModelName())
                                .operationType(request.getOperationType())
                                .isEnabled(false)
                                .isPrimary(false)
                                .build();
                    }

                    if (newIsPrimary) {
                        clearPrimaryForOperation(request.getOperationType());
                    }

                    final ChatModelSetting newSetting = ChatModelSetting.builder()
                            .modelName(request.getModelName())
                            .operationType(request.getOperationType())
                            .isEnabled(newIsEnabled)
                            .isPrimary(newIsPrimary)
                            .build();

                    return toResponse(chatModelSettingRepository.save(newSetting));
                });
    }

    private void clearPrimaryForOperation(OperationType operationType) {
        chatModelSettingRepository.clearPrimaryByOperationType(operationType);
    }

    @Transactional
    public void enableAllModelsForOperation(OperationType operationType) {
        chatModelSettingRepository.enableByOperationType(operationType);

        final Set<String> existingModels = chatModelSettingRepository.findByOperationType(operationType).stream()
                .map(ChatModelSetting::getModelName)
                .collect(Collectors.toSet());

        final List<ChatModelSetting> newSettings = Arrays.stream(ChatModel.values())
                .filter(model -> !existingModels.contains(model.getModelName()))
                .map(model -> ChatModelSetting.builder()
                        .modelName(model.getModelName())
                        .operationType(operationType)
                        .isEnabled(true)
                        .build())
                .toList();

        if (!newSettings.isEmpty()) {
            chatModelSettingRepository.saveAll(newSettings);
        }
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
