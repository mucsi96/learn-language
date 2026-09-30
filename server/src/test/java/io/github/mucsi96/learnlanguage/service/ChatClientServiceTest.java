package io.github.mucsi96.learnlanguage.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;

import io.github.mucsi96.learnlanguage.model.ChatModel;

class ChatClientServiceTest {

    @Test
    void sendsGpt61SolRequestsWithLowReasoningEffort() {
        final OpenAiChatModel openAiChatModel = mock(OpenAiChatModel.class);
        when(openAiChatModel.getOptions()).thenReturn(OpenAiChatOptions.builder().build());
        when(openAiChatModel.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of()));
        final ChatClientService service = new ChatClientService(openAiChatModel, null, null, null);

        service.getChatClient(ChatModel.GPT_6_1_SOL).prompt().user("Translate Hallo").call().chatResponse();

        final ArgumentCaptor<Prompt> prompt = ArgumentCaptor.forClass(Prompt.class);
        verify(openAiChatModel).call(prompt.capture());
        final OpenAiChatOptions options = (OpenAiChatOptions) prompt.getValue().getOptions();
        assertThat(options.getModel()).isEqualTo("gpt-6.1-sol");
        assertThat(options.getReasoningEffort()).isEqualTo("low");
    }
}
