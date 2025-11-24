package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.WordRequest;
import io.github.mucsi96.learnlanguage.model.GenderResponse;
import io.github.mucsi96.learnlanguage.service.GenderDetectionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class GenderController {

    private final GenderDetectionService genderDetectionService;

    @PostMapping("/gender")
    public ResponseEntity<GenderResponse> getGender(@RequestBody WordRequest word) {
        String gender = genderDetectionService.detectGender(word.getWord());
        return ResponseEntity.ok(new GenderResponse(gender));
    }
}
