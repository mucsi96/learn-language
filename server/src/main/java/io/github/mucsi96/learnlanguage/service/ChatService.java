package io.github.mucsi96.learnlanguage.service;

import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.PromptUserSpec;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatClientService chatClientService;
    private final ModelUsageLoggingService usageLoggingService;
    private final ObjectMapper objectMapper;

    public <T> T callWithLogging(
            ChatModel model,
            String operationType,
            String systemPrompt,
            String userMessage,
            Class<T> responseType) {

        return callWithLoggingInternal(
                model,
                operationType,
                systemPrompt,
                u -> u.text(userMessage),
                responseType);
    }

    public <T> T callWithLoggingAndMedia(
            ChatModel model,
            String operationType,
            String systemPrompt,
            Consumer<PromptUserSpec> userBuilder,
            Class<T> responseType) {

        return callWithLoggingInternal(
                model,
                operationType,
                systemPrompt,
                userBuilder,
                responseType);
    }

    private <T> T callWithLoggingInternal(
            ChatModel model,
            String operationType,
            String systemPrompt,
            Consumer<PromptUserSpec> userBuilder,
            Class<T> responseType) {

        long startTime = System.currentTimeMillis();

        ChatClient chatClient = chatClientService.getChatClient(model);

        ChatClient.CallResponseSpec callResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .user(userBuilder)
                .call();

        var chatResponse = callResponse.responseEntity(responseType);

        long processingTime = System.currentTimeMillis() - startTime;

        var entity = chatResponse.getEntity();

        try {
          logUsage(model, operationType, chatResponse.getResponse(), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(entity), processingTime);
        } catch (JsonProcessingException e) {
          e.printStackTrace();
        }

        return entity;
    }

    private void logUsage(ChatModel model, String operationType, ChatResponse chatResponse, String text, long processingTime) {
        try {
            var usage = chatResponse.getMetadata().getUsage();
            long inputTokens = usage.getPromptTokens();
            long outputTokens = usage.getCompletionTokens();

            usageLoggingService.logChatUsage(
                    model.getModelName(),
                    operationType,
                    inputTokens,
                    outputTokens,
                    processingTime,
                    text);
        } catch (Exception e) {
            log.warn("Failed to log chat usage: {}", e.getMessage());
        }
    }
}
