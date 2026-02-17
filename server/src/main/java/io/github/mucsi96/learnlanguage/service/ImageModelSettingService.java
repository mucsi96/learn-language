package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.ImageModelSetting;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ImageModelResponse;
import io.github.mucsi96.learnlanguage.model.ImageModelSettingRequest;
import io.github.mucsi96.learnlanguage.repository.ImageModelSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImageModelSettingService {

    private final ImageModelSettingRepository imageModelSettingRepository;

    public List<ImageModelResponse> getImageModelsWithSettings() {
        final Map<String, Integer> overrides = imageModelSettingRepository.findAll().stream()
                .collect(Collectors.toMap(
                        ImageModelSetting::getModelName,
                        ImageModelSetting::getImageCount));

        return Arrays.stream(ImageGenerationModel.values())
                .map(model -> ImageModelResponse.builder()
                        .id(model.getModelName())
                        .displayName(model.getDisplayName())
                        .imageCount(overrides.getOrDefault(model.getModelName(), model.getImageCount()))
                        .build())
                .toList();
    }

    public int getImageCount(ImageGenerationModel model) {
        return imageModelSettingRepository.findByModelName(model.getModelName())
                .map(ImageModelSetting::getImageCount)
                .orElse(model.getImageCount());
    }

    @Transactional
    public ImageModelResponse updateSetting(ImageModelSettingRequest request) {
        final ImageGenerationModel model = ImageGenerationModel.fromString(request.getModelName());

        final ImageModelSetting setting = imageModelSettingRepository
                .findByModelName(request.getModelName())
                .map(existing -> existing.toBuilder()
                        .imageCount(request.getImageCount())
                        .build())
                .orElseGet(() -> ImageModelSetting.builder()
                        .modelName(request.getModelName())
                        .imageCount(request.getImageCount())
                        .build());

        final ImageModelSetting saved = imageModelSettingRepository.save(setting);

        return ImageModelResponse.builder()
                .id(saved.getModelName())
                .displayName(model.getDisplayName())
                .imageCount(saved.getImageCount())
                .build();
    }
}
