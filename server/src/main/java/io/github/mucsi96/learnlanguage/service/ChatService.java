package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.PromptUserSpec;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;
import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private static final DateTimeFormatter DEBUG_FILE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss-SSS");

    private final ChatClientService chatClientService;
    private final ModelUsageLoggingService usageLoggingService;
    private final JsonMapper jsonMapper;
    private final FileStorageService fileStorageService;
    private final Environment environment;

    public <T> T callWithLogging(
            ChatModel model,
            OperationType operationType,
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
            OperationType operationType,
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

    public <T> T callWithLoggingAndMedia(
            ChatModel model,
            OperationType operationType,
            String systemPrompt,
            byte[] imageData,
            Consumer<PromptUserSpec> userBuilder,
            Class<T> responseType) {

        saveDebugImage(imageData, operationType);

        return callWithLoggingInternal(
                model,
                operationType,
                systemPrompt,
                userBuilder,
                responseType);
    }

    private void saveDebugImage(byte[] imageData, OperationType operationType) {
        if (!Arrays.asList(environment.getActiveProfiles()).contains("local")) {
            return;
        }
        final String timestamp = LocalDateTime.now().format(DEBUG_FILE_FORMATTER);
        final String fileName = "debug/" + operationType.getCode() + "_" + timestamp + ".png";
        log.info("Saving debug image to: {}", fileName);
        fileStorageService.saveFile(BinaryData.fromBytes(imageData), fileName);
    }

    public String callForTextWithLogging(
            ChatModel model,
            OperationType operationType,
            String systemPrompt,
            String userMessage) {

        long startTime = System.currentTimeMillis();

        ChatClient chatClient = chatClientService.getChatClient(model);

        ChatClient.CallResponseSpec callResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .user(u -> u.text(userMessage))
                .call();

        final ChatResponse response = callResponse.chatResponse();
        final String text = response.getResult().getOutput().getText();

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, response, jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(text), processingTime);

        return text;
    }

    public Flux<String> streamForText(
            ChatModel model,
            String systemPrompt,
            String userMessage) {

        final ChatClient chatClient = chatClientService.getChatClient(model);

        return chatClient
                .prompt()
                .system(systemPrompt)
                .user(u -> u.text(userMessage))
                .stream()
                .content();
    }

    private <T> T callWithLoggingInternal(
            ChatModel model,
            OperationType operationType,
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
        final ChatResponse response = chatResponse.getResponse();
        final T entity = chatResponse.getEntity();

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, response, jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(entity), processingTime);

        return entity;
    }

    private void logUsage(ChatModel model, OperationType operationType, ChatResponse chatResponse, String text, long processingTime) {
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
