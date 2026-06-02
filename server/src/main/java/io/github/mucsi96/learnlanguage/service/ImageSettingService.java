package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.ImageSetting;
import io.github.mucsi96.learnlanguage.repository.ImageSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImageSettingService {

    private static final String USE_ENGLISH_KEY = "use-english-for-image-generation";

    private final ImageSettingRepository imageSettingRepository;

    public boolean isUseEnglishForImageGeneration() {
        return imageSettingRepository.findById(USE_ENGLISH_KEY)
                .map(ImageSetting::getValue)
                .map(value -> value != 0)
                .orElse(false);
    }

    @Transactional
    public void setUseEnglishForImageGeneration(boolean useEnglish) {
        imageSettingRepository.save(
                ImageSetting.builder().key(USE_ENGLISH_KEY).value(useEnglish ? 1 : 0).build()
        );
    }
}
