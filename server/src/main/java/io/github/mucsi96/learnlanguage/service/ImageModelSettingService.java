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
        final Map<String, ImageModelSetting> overrides = imageModelSettingRepository.findAll().stream()
                .collect(Collectors.toMap(
                        ImageModelSetting::getModelName,
                        setting -> setting));

        return Arrays.stream(ImageGenerationModel.values())
                .map(model -> {
                    final ImageModelSetting setting = overrides.get(model.getModelName());
                    return ImageModelResponse.builder()
                            .id(model.getModelName())
                            .displayName(model.getDisplayName())
                            .imageCount(setting == null ? 0 : setting.getImageCount())
                            .describedImageCount(setting == null ? 0 : setting.getDescribedImageCount())
                            .build();
                })
                .toList();
    }

    @Transactional
    public ImageModelResponse updateSetting(ImageModelSettingRequest request) {
        final ImageGenerationModel model = ImageGenerationModel.fromString(request.getModelName());

        final ImageModelSetting setting = imageModelSettingRepository
                .findByModelName(request.getModelName())
                .map(existing -> existing.toBuilder()
                        .imageCount(request.getImageCount())
                        .describedImageCount(request.getDescribedImageCount())
                        .build())
                .orElseGet(() -> ImageModelSetting.builder()
                        .modelName(request.getModelName())
                        .imageCount(request.getImageCount())
                        .describedImageCount(request.getDescribedImageCount())
                        .build());

        final ImageModelSetting saved = imageModelSettingRepository.save(setting);

        return ImageModelResponse.builder()
                .id(saved.getModelName())
                .displayName(model.getDisplayName())
                .imageCount(saved.getImageCount())
                .describedImageCount(saved.getDescribedImageCount())
                .build();
    }
}
