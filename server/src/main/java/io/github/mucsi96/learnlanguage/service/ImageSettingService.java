package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.ImageSetting;
import io.github.mucsi96.learnlanguage.repository.ImageSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImageSettingService {

    private static final int SINGLETON_ID = 1;

    private final ImageSettingRepository imageSettingRepository;

    public boolean isUseEnglishForImageGeneration() {
        return imageSettingRepository.findById(SINGLETON_ID)
                .map(ImageSetting::getUseEnglishForImageGeneration)
                .orElse(false);
    }

    @Transactional
    public void setUseEnglishForImageGeneration(boolean useEnglish) {
        imageSettingRepository.save(
                ImageSetting.builder()
                        .id(SINGLETON_ID)
                        .useEnglishForImageGeneration(useEnglish)
                        .build()
        );
    }
}
