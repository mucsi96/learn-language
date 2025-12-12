package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.WordRequest;
import io.github.mucsi96.learnlanguage.model.GenderResponse;
import io.github.mucsi96.learnlanguage.service.ChatClientService;
import io.github.mucsi96.learnlanguage.service.GenderDetectionService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class GenderController {

    private final GenderDetectionService genderDetectionService;
    private final ChatClientService chatClientService;

    @PostMapping("/gender")
    public ResponseEntity<GenderResponse> getGender(
            @RequestBody WordRequest word,
            @RequestParam ChatModel model) {
        String gender = genderDetectionService.detectGender(word.getWord(), chatClientService.getChatClient(model));
        return ResponseEntity.ok(new GenderResponse(gender));
    }
}
