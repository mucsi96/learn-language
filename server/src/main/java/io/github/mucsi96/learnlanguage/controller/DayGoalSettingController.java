package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.DayGoalSettingRequest;
import io.github.mucsi96.learnlanguage.model.DayGoalSettingResponse;
import io.github.mucsi96.learnlanguage.model.DayGoalTier;
import io.github.mucsi96.learnlanguage.service.DayGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/day-goal-settings")
@RequiredArgsConstructor
public class DayGoalSettingController {

    private final DayGoalService dayGoalService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public List<DayGoalSettingResponse> getDayGoalSettings() {
        return dayGoalService.getSettings();
    }

    @PutMapping("/{tier}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public DayGoalSettingResponse updateDayGoalSetting(
            @PathVariable DayGoalTier tier,
            @Valid @RequestBody DayGoalSettingRequest request) {
        return dayGoalService.updateSetting(tier, request);
    }
}
