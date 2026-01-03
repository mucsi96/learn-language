package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModelSettingRequest;
import io.github.mucsi96.learnlanguage.model.ChatModelSettingResponse;
import io.github.mucsi96.learnlanguage.service.ChatModelSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/chat-model-settings")
@RequiredArgsConstructor
public class ChatModelSettingController {

    private final ChatModelSettingService chatModelSettingService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<ChatModelSettingResponse> getAllSettings() {
        return chatModelSettingService.getAllSettings();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ChatModelSettingResponse updateSetting(@Valid @RequestBody ChatModelSettingRequest request) {
        return chatModelSettingService.updateSetting(request);
    }

    @PostMapping("/enable-all/{operationType}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> enableAllModelsForOperation(@PathVariable String operationType) {
        chatModelSettingService.enableAllModelsForOperation(operationType);
        return ResponseEntity.ok().build();
    }
}
