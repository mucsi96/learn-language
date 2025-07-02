package io.github.mucsi96.learnlanguage.tracing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AITracingResponseMessage {
    private String role;
    private String content;
}
