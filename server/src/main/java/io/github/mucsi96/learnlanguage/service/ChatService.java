package io.github.mucsi96.learnlanguage.service;

import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.PromptUserSpec;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatClientService chatClientService;
    private final ModelUsageLoggingService usageLoggingService;

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

        ChatResponse chatResponse = callResponse.chatResponse();
        T result = callResponse.entity(responseType);

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, chatResponse, processingTime);

        return result;
    }

    public String callWithLoggingRaw(
            ChatModel model,
            String operationType,
            String systemPrompt,
            String userMessage) {

        long startTime = System.currentTimeMillis();

        ChatClient chatClient = chatClientService.getChatClient(model);

        ChatClient.CallResponseSpec callResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .user(userMessage)
                .call();

        ChatResponse chatResponse = callResponse.chatResponse();
        String content = callResponse.content();

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, chatResponse, processingTime);

        return content;
    }

    private void logUsage(ChatModel model, String operationType, ChatResponse chatResponse, long processingTime) {
        try {
            var usage = chatResponse.getMetadata().getUsage();
            long inputTokens = usage.getPromptTokens();
            long outputTokens = usage.getCompletionTokens();

            usageLoggingService.logChatUsage(
                    model.getModelName(),
                    operationType,
                    inputTokens,
                    outputTokens,
                    processingTime);
        } catch (Exception e) {
            log.warn("Failed to log chat usage: {}", e.getMessage());
        }
    }
}
