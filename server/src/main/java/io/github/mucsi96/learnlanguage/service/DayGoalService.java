package io.github.mucsi96.learnlanguage.service;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.DayGoalSetting;
import io.github.mucsi96.learnlanguage.model.DayGoalProgressResponse;
import io.github.mucsi96.learnlanguage.model.DayGoalSettingRequest;
import io.github.mucsi96.learnlanguage.model.DayGoalSettingResponse;
import io.github.mucsi96.learnlanguage.model.DayGoalTier;
import io.github.mucsi96.learnlanguage.repository.DayGoalSettingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DayGoalService {

    private static final Map<DayGoalTier, DayGoalSetting> DEFAULTS = Map.of(
            DayGoalTier.BRONZE, completionOnly(DayGoalTier.BRONZE, 50),
            DayGoalTier.SILVER, completionOnly(DayGoalTier.SILVER, 75),
            DayGoalTier.GOLD, completionOnly(DayGoalTier.GOLD, 100));

    private final DayGoalSettingRepository dayGoalSettingRepository;

    @Transactional(readOnly = true)
    public List<DayGoalSettingResponse> getSettings() {
        return settings().stream()
                .map(DayGoalService::toResponse)
                .toList();
    }

    @Transactional
    public DayGoalSettingResponse updateSetting(DayGoalTier tier, DayGoalSettingRequest request) {
        final DayGoalSetting setting = DayGoalSetting.builder()
                .tier(tier)
                .requiredCompletionPercent(request.getRequiredCompletionPercent())
                .requiredAccuracyPercent(request.getRequiredAccuracyPercent())
                .build();
        return toResponse(dayGoalSettingRepository.save(setting));
    }

    @Transactional(readOnly = true)
    public DayGoalProgressResponse evaluate(int totalCards, int completedCards, int goodCount, int badCount) {
        final int completionPercent = totalCards == 0 ? 100 : completedCards * 100 / totalCards;
        final int reviewCount = goodCount + badCount;
        final int accuracyPercent = reviewCount == 0 ? 0 : (int) Math.round(goodCount * 100.0 / reviewCount);

        final List<DayGoalProgressResponse.TierProgress> tiers = settings().stream()
                .map(setting -> DayGoalProgressResponse.TierProgress.builder()
                        .tier(setting.getTier())
                        .requiredCompletionPercent(setting.getRequiredCompletionPercent())
                        .requiredAccuracyPercent(setting.getRequiredAccuracyPercent())
                        .achieved(completionPercent >= setting.getRequiredCompletionPercent()
                                && accuracyPercent >= setting.getRequiredAccuracyPercent())
                        .build())
                .toList();

        final DayGoalTier achievedTier = tiers.stream()
                .filter(DayGoalProgressResponse.TierProgress::isAchieved)
                .map(DayGoalProgressResponse.TierProgress::getTier)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return DayGoalProgressResponse.builder()
                .completionPercent(completionPercent)
                .accuracyPercent(accuracyPercent)
                .achievedTier(achievedTier)
                .tiers(tiers)
                .build();
    }

    private List<DayGoalSetting> settings() {
        final Map<DayGoalTier, DayGoalSetting> stored = dayGoalSettingRepository.findAll().stream()
                .collect(Collectors.toMap(DayGoalSetting::getTier, Function.identity()));
        return Arrays.stream(DayGoalTier.values())
                .map(tier -> stored.getOrDefault(tier, DEFAULTS.get(tier)))
                .toList();
    }

    private static DayGoalSetting completionOnly(DayGoalTier tier, int requiredCompletionPercent) {
        return DayGoalSetting.builder()
                .tier(tier)
                .requiredCompletionPercent(requiredCompletionPercent)
                .requiredAccuracyPercent(0)
                .build();
    }

    private static DayGoalSettingResponse toResponse(DayGoalSetting setting) {
        return DayGoalSettingResponse.builder()
                .tier(setting.getTier())
                .requiredCompletionPercent(setting.getRequiredCompletionPercent())
                .requiredAccuracyPercent(setting.getRequiredAccuracyPercent())
                .build();
    }
}
