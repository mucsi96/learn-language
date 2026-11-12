package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.ai.converter.BeanOutputConverter;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.service.VoiceGenderService.VoiceGenderResponse;
import tools.jackson.databind.json.JsonMapper;

class VoiceGenderServiceTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final BeanOutputConverter<VoiceGenderResponse> converter =
        new BeanOutputConverter<>(VoiceGenderResponse.class);

    @Test
    void sendsNullableProviderStructuredOutputAndAcceptsNull() {
        final var model = mock(OpenAiChatModel.class);
        when(model.getOptions()).thenReturn(OpenAiChatOptions.builder().build());
        when(model.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
            new Generation(new AssistantMessage("{\"voiceGenderHint\":null}")))));
        final var chat = new ChatService(new ChatClientService(model, null, null, null),
            mock(ModelUsageLoggingService.class), mapper, null, null, null);

        final var result = new VoiceGenderService(chat).classify("Hallo!", ChatModel.GPT_6_1_SOL);

        assertThat(mapper.valueToTree(result).has("voiceGenderHint")).isFalse();
        final var prompt = ArgumentCaptor.forClass(Prompt.class);
        verify(model).call(prompt.capture());
        final var options = (OpenAiChatOptions) prompt.getValue().getOptions();
        final var schema = mapper.readTree(options.getOutputSchema());
        assertThat(schema.path("properties").path("voiceGenderHint").path("type"))
            .isEqualTo(mapper.readTree("[\"string\",\"null\"]"));
    }

    @Test
    void structuredOutputAllowsJsonNullWithoutAnEnumExcludingIt() {
        final var schema = mapper.readTree(converter.getJsonSchema());
        final var hint = schema.path("properties").path("voiceGenderHint");
        assertThat(hint.path("type")).isEqualTo(mapper.readTree("[\"string\",\"null\"]"));
        assertThat(hint.has("enum")).isFalse();
        assertThat(schema.path("required")).isEqualTo(mapper.readTree("[\"voiceGenderHint\"]"));
        assertThat(schema.path("additionalProperties").asBoolean()).isFalse();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"male", "female"})
    void acceptsStructuredResponsesAndOmitsUnknownGender(String gender) {
        final var response = converter.convert("{\"voiceGenderHint\":" + mapper.writeValueAsString(gender) + "}");
        final var chat = mock(ChatService.class);
        when(chat.callWithLogging(eq(ChatModel.GPT_6_1_SOL), eq(OperationType.CLASSIFICATION),
            anyString(), eq("Hallo!"), eq(VoiceGenderResponse.class))).thenReturn(response);

        final var result = new VoiceGenderService(chat).classify("Hallo!", ChatModel.GPT_6_1_SOL);

        assertThat(result.voiceGenderHint()).isEqualTo(gender);
        assertThat(mapper.valueToTree(result).has("voiceGenderHint")).isEqualTo(gender != null);
    }

    @Test
    void rejectsValuesOutsideTheStructuredContract() {
        final var chat = mock(ChatService.class);
        when(chat.callWithLogging(eq(ChatModel.GPT_6_1_SOL), eq(OperationType.CLASSIFICATION),
            anyString(), eq("Hallo!"), eq(VoiceGenderResponse.class)))
            .thenReturn(new VoiceGenderResponse("null"));

        assertThatThrownBy(() -> new VoiceGenderService(chat).classify("Hallo!", ChatModel.GPT_6_1_SOL))
            .isInstanceOf(IllegalStateException.class);
    }
}
