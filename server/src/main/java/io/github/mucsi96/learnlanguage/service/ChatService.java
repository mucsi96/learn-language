package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.PromptUserSpec;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.azure.core.util.BinaryData;
import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
        final String text = extractResponseText(response);

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, response, jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(text), processingTime);

        return requireResponseText(text, model, operationType, response);
    }

    public String callForTextWithHistory(
            ChatModel model,
            OperationType operationType,
            String systemPrompt,
            List<Message> messages) {

        long startTime = System.currentTimeMillis();

        ChatClient chatClient = chatClientService.getChatClient(model);

        ChatClient.CallResponseSpec callResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .messages(messages)
                .call();

        final ChatResponse response = callResponse.chatResponse();
        final String text = extractResponseText(response);

        long processingTime = System.currentTimeMillis() - startTime;

        logUsage(model, operationType, response, jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(text), processingTime);

        return requireResponseText(text, model, operationType, response);
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

        final var outputConverter = new BeanOutputConverter<T>(responseType) {
            @Override
            public T convert(String text) {
                return StringUtils.hasText(text) ? super.convert(text) : null;
            }
        };

        var chatResponse = callResponse.responseEntity(outputConverter,
                spec -> spec.useProviderStructuredOutput());
        final ChatResponse response = chatResponse.getResponse();
        // ChatResponse.getResult() returns the first generation, but Anthropic
        // thinking models emit thinking blocks as generations before the text
        // generation, so the entity may be missing even though text was produced.
        final T entity = Optional.ofNullable(chatResponse.getEntity())
                .orElseGet(() -> Optional.ofNullable(extractResponseText(response))
                        .map(outputConverter::convert)
                        .orElse(null));

        long processingTime = System.currentTimeMillis() - startTime;

        if (entity == null) {
            logUsage(model, operationType, response, "", processingTime);
            throw noContentException(model, operationType, response);
        }

        logUsage(model, operationType, response, jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(entity), processingTime);

        return entity;
    }

    private String requireResponseText(String text, ChatModel model, OperationType operationType,
            ChatResponse response) {
        return Optional.ofNullable(text)
                .orElseThrow(() -> noContentException(model, operationType, response));
    }

    private IllegalStateException noContentException(ChatModel model, OperationType operationType,
            ChatResponse response) {
        return new IllegalStateException(
                "Chat model %s returned no content for operation %s (finish reason: %s)".formatted(
                        model.getModelName(),
                        operationType.getCode(),
                        extractFinishReason(response)));
    }

    private String extractFinishReason(ChatResponse response) {
        return Optional.ofNullable(response)
                .map(ChatResponse::getResult)
                .map(result -> result.getMetadata().getFinishReason())
                .orElse("unknown");
    }

    // Anthropic thinking models produce a thinking generation before the text
    // generation, so the text is the last generation with non-blank content.
    private String extractResponseText(ChatResponse response) {
        return Optional.ofNullable(response)
                .map(ChatResponse::getResults)
                .orElse(List.of())
                .stream()
                .map(generation -> generation.getOutput().getText())
                .filter(StringUtils::hasText)
                .reduce((first, last) -> last)
                .orElse(null);
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
