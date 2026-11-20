package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.mucsi96.learnlanguage.entity.ImageModelSetting;
import io.github.mucsi96.learnlanguage.model.ImageModelResponse;
import io.github.mucsi96.learnlanguage.repository.ImageModelSettingRepository;

class ImageModelSettingServiceTest {

    @Test
    void retainsMediumCountsAndExcludesRetiredSelections() {
        final var repository = mock(ImageModelSettingRepository.class);
        when(repository.findAll()).thenReturn(List.of(
            ImageModelSetting.builder().modelName("gpt-image-2.6-sunburst-medium").imageCount(2).build(),
            ImageModelSetting.builder().modelName("gpt-image-2.6-flare-medium").imageCount(3).build(),
            ImageModelSetting.builder().modelName("gpt-image-2.6-flare-high").imageCount(4).build(),
            ImageModelSetting.builder().modelName("gemini-3-pro-image-preview").imageCount(5).build()));

        final var models = new ImageModelSettingService(repository).getImageModelsWithSettings();

        assertThat(models).extracting(ImageModelResponse::getDisplayName)
            .containsExactly("GPT Image 2.6 Sunburst", "GPT Image 2.6 Flare");
        assertThat(models).extracting(ImageModelResponse::getImageCount).containsExactly(2, 3);
    }
}
