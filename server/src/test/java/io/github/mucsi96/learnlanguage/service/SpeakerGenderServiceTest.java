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
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.service.SpeakerGenderService.SpeakerGenderResponse;
import tools.jackson.databind.json.JsonMapper;

class SpeakerGenderServiceTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final BeanOutputConverter<SpeakerGenderResponse> converter =
        new BeanOutputConverter<>(SpeakerGenderResponse.class);

    @Test
    void sendsProviderStructuredEnumOutputAndOmitsUnknown() {
        final var model = mock(OpenAiChatModel.class);
        when(model.getOptions()).thenReturn(OpenAiChatOptions.builder().build());
        when(model.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
            new Generation(new AssistantMessage("{\"speakerGenderHint\":\"unknown\"}")))));
        final var chat = new ChatService(new ChatClientService(model, null, null, null),
            mock(ModelUsageLoggingService.class), mapper, null, null, null);

        final var result = new SpeakerGenderService(chat).classify("Hallo!", ChatModel.GPT_6_1_SOL);

        assertThat(mapper.valueToTree(result).has("speakerGenderHint")).isFalse();
        final var prompt = ArgumentCaptor.forClass(Prompt.class);
        verify(model).call(prompt.capture());
        final var options = (OpenAiChatOptions) prompt.getValue().getOptions();
        final var schema = mapper.readTree(options.getOutputSchema());
        assertThat(schema.path("properties").path("speakerGenderHint").path("enum"))
            .isEqualTo(mapper.readTree("[\"male\",\"female\",\"unknown\"]"));
    }

    @Test
    void structuredOutputAllowsExactlyThreeEnumValues() {
        final var schema = mapper.readTree(converter.getJsonSchema());
        final var hint = schema.path("properties").path("speakerGenderHint");
        assertThat(hint.path("type").asString()).isEqualTo("string");
        assertThat(hint.path("enum")).isEqualTo(mapper.readTree("[\"male\",\"female\",\"unknown\"]"));
        assertThat(schema.path("required")).isEqualTo(mapper.readTree("[\"speakerGenderHint\"]"));
        assertThat(schema.path("additionalProperties").asBoolean()).isFalse();
    }

    @Test
    void sendsGeminiCompatibleEnumStructuredOutput() {
        final var model = mock(GoogleGenAiChatModel.class);
        when(model.getOptions()).thenReturn(GoogleGenAiChatOptions.builder().build());
        when(model.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
            new Generation(new AssistantMessage("{\"speakerGenderHint\":\"unknown\"}")))));
        final var chat = new ChatService(new ChatClientService(null, null, model, null),
            mock(ModelUsageLoggingService.class), mapper, null, null, null);

        final var result = new SpeakerGenderService(chat).classify("Hallo!", ChatModel.GEMINI_3_1_PRO_PREVIEW);

        assertThat(result.speakerGenderHint()).isNull();
        final var prompt = ArgumentCaptor.forClass(Prompt.class);
        verify(model).call(prompt.capture());
        final var options = (GoogleGenAiChatOptions) prompt.getValue().getOptions();
        final var schema = com.google.genai.types.Schema.fromJson(options.getOutputSchema());
        final var hint = schema.properties().orElseThrow().get("speakerGenderHint");
        assertThat(hint.enum_().orElseThrow()).containsExactly("male", "female", "unknown");
        assertThat(schema.required().orElseThrow()).contains("speakerGenderHint");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"male", "female", "unknown"})
    void acceptsStructuredResponsesAndOmitsUnknownGender(String gender) {
        final var response = converter.convert("{\"speakerGenderHint\":" + mapper.writeValueAsString(gender) + "}");
        final var chat = mock(ChatService.class);
        when(chat.callWithLogging(eq(ChatModel.GPT_6_1_SOL), eq(OperationType.CLASSIFICATION),
            anyString(), eq("Hallo!"), eq(SpeakerGenderResponse.class))).thenReturn(response);

        final var result = new SpeakerGenderService(chat).classify("Hallo!", ChatModel.GPT_6_1_SOL);

        final boolean unknown = gender == null || gender.equals("unknown");
        final tools.jackson.databind.JsonNode json = mapper.valueToTree(result);
        assertThat(json).isEqualTo(unknown
            ? mapper.readTree("{}") : mapper.readTree("{\"speakerGenderHint\":\"" + gender + "\"}"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "other", ""})
    void rejectsValuesOutsideTheStructuredContract(String value) {
        assertThatThrownBy(() -> converter.convert("{\"speakerGenderHint\":" + mapper.writeValueAsString(value) + "}"))
            .isInstanceOf(tools.jackson.core.JacksonException.class);
    }
}
