package io.github.mucsi96.learnlanguage.tracing;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AITracingRunOutputs {
    private List<AITracingChoice> choices;
    private Map<String, Object> additionalProperties;
}
