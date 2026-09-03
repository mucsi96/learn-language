package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.mucsi96.learnlanguage.entity.DayGoalSetting;
import io.github.mucsi96.learnlanguage.model.DayGoalProgressResponse;
import io.github.mucsi96.learnlanguage.model.DayGoalSettingResponse;
import io.github.mucsi96.learnlanguage.model.DayGoalTier;
import io.github.mucsi96.learnlanguage.repository.DayGoalSettingRepository;

class DayGoalServiceTest {

  private final DayGoalSettingRepository repository = mock(DayGoalSettingRepository.class);
  private final DayGoalService service = new DayGoalService(repository);

  @Test
  void fallsBackToTheDefaultRequirementsOfEveryTier() {
    when(repository.findAll()).thenReturn(List.of());

    assertThat(service.getSettings())
        .extracting(
            DayGoalSettingResponse::getTier,
            DayGoalSettingResponse::getRequiredCompletionPercent,
            DayGoalSettingResponse::getRequiredAccuracyPercent)
        .containsExactly(
            tuple(DayGoalTier.BRONZE, 50, 0),
            tuple(DayGoalTier.SILVER, 75, 0),
            tuple(DayGoalTier.GOLD, 100, 0));
  }

  @Test
  void aStoredSettingReplacesOnlyTheDefaultOfItsTier() {
    when(repository.findAll()).thenReturn(List.of(stored(DayGoalTier.SILVER, 60, 40)));

    assertThat(service.getSettings())
        .extracting(
            DayGoalSettingResponse::getTier,
            DayGoalSettingResponse::getRequiredCompletionPercent,
            DayGoalSettingResponse::getRequiredAccuracyPercent)
        .containsExactly(
            tuple(DayGoalTier.BRONZE, 50, 0),
            tuple(DayGoalTier.SILVER, 60, 40),
            tuple(DayGoalTier.GOLD, 100, 0));
  }

  @Test
  void awardsTheHighestTierWhoseRequirementsAreMet() {
    when(repository.findAll()).thenReturn(List.of());

    final DayGoalProgressResponse progress = service.evaluate(4, 3, 3, 0);

    assertThat(progress.getCompletionPercent()).isEqualTo(75);
    assertThat(progress.getAchievedTier()).isEqualTo(DayGoalTier.SILVER);
    assertThat(progress.getTiers())
        .extracting(DayGoalProgressResponse.TierProgress::getTier, DayGoalProgressResponse.TierProgress::isAchieved)
        .containsExactly(
            tuple(DayGoalTier.BRONZE, true),
            tuple(DayGoalTier.SILVER, true),
            tuple(DayGoalTier.GOLD, false));
  }

  @Test
  void fullCompletionMeansEveryCardIsDone() {
    when(repository.findAll()).thenReturn(List.of());

    final DayGoalProgressResponse progress = service.evaluate(200, 199, 199, 0);

    assertThat(progress.getCompletionPercent()).isEqualTo(99);
    assertThat(progress.getAchievedTier()).isEqualTo(DayGoalTier.SILVER);
  }

  @Test
  void anAccuracyRequirementWithholdsTheTier() {
    when(repository.findAll()).thenReturn(List.of(stored(DayGoalTier.GOLD, 100, 100)));

    final DayGoalProgressResponse progress = service.evaluate(2, 2, 1, 1);

    assertThat(progress.getAccuracyPercent()).isEqualTo(50);
    assertThat(progress.getAchievedTier()).isEqualTo(DayGoalTier.SILVER);
  }

  @Test
  void noTierIsAchievedBeforeTheLowestRequirement() {
    when(repository.findAll()).thenReturn(List.of());

    final DayGoalProgressResponse progress = service.evaluate(4, 1, 1, 0);

    assertThat(progress.getAchievedTier()).isNull();
    assertThat(progress.getTiers()).noneMatch(DayGoalProgressResponse.TierProgress::isAchieved);
  }

  @Test
  void aSessionWithoutCardsCountsAsComplete() {
    when(repository.findAll()).thenReturn(List.of());

    final DayGoalProgressResponse progress = service.evaluate(0, 0, 0, 0);

    assertThat(progress.getCompletionPercent()).isEqualTo(100);
    assertThat(progress.getAccuracyPercent()).isZero();
    assertThat(progress.getAchievedTier()).isEqualTo(DayGoalTier.GOLD);
  }

  private static DayGoalSetting stored(DayGoalTier tier, int completion, int accuracy) {
    return DayGoalSetting.builder()
        .tier(tier)
        .requiredCompletionPercent(completion)
        .requiredAccuracyPercent(accuracy)
        .build();
  }
}
