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
public class AITracingRunRequest {
    private String id;
    private String name;
    @JsonProperty("session_name")
    private String project;
    @JsonProperty("run_type")
    private AITracingRunType runType;
    private Object inputs;
    @JsonProperty("start_time")
    private OffsetDateTime startTime;
    @JsonProperty("parent_run_id")
    private String parentRunId;
}
