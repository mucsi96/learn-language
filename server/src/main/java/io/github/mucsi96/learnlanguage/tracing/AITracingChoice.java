package io.github.mucsi96.learnlanguage.tracing;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.openai.models.chat.completions.ChatCompletion.Choice;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AITracingChoice {
  private long index;
  private AITracingResponseMessage message;
  @JsonProperty("finish_reason")
  private String finishReason;

  public static AITracingChoice from(Choice choice) {
    return AITracingChoice.builder()
        .index(choice.index())
        .message(AITracingResponseMessage.builder()
            .role(choice.message()._role().toString())
            .content(choice.message().content().orElse(null))
            .build())
        .finishReason(choice.finishReason().toString())
        .build();
  }
}
