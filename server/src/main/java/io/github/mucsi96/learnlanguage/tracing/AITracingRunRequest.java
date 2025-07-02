package io.github.mucsi96.learnlanguage.tracing;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.List;

// https://api.smith.langchain.com/redoc?_gl=1*1jo2vhh*_gcl_au*NzY4NDEzMDMuMTc1MTIyMDU3Nw..*_ga*MzQxNjI4NzAyLjE3NTEyMjA1Nzg.*_ga_47WX3HKKY2*czE3NTE0Mzg4MjUkbzYkZzEkdDE3NTE0Mzg5NTIkajYwJGwwJGgw#tag/runs/paths/~1runs/post

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
    private AITracingRunInputs inputs;
    @JsonProperty("start_time")
    private OffsetDateTime startTime;
    @JsonProperty("parent_run_id")
    private String parentRunId;
    private List<String> tags;
}
