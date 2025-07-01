package io.github.mucsi96.learnlanguage.tracing;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AITracingRunPatchRequest {
    private Object outputs;
    @JsonProperty("end_time")
    private OffsetDateTime endTime;
}
