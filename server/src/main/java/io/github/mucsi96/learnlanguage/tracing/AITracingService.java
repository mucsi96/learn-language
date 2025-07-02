package io.github.mucsi96.learnlanguage.tracing;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AITracingService {
  private final RestTemplate restTemplate;

  @Value("${langsmith.enabled}")
  private boolean langsmithEnabled;

  @Value("${langsmith.apiKey}")
  private String langsmithApiKey;

  @Value("${langsmith.apiUrl}")
  private String langsmithApiUrl;

  @Value("${langsmith.project}")
  private String langsmithProject;

  public void postRun(UUID runId, String name, AITracingRunType runType, AITracingRunInputs inputs) {
    if (!langsmithEnabled) {
      return;
    }

    AITracingRunRequest request = AITracingRunRequest.builder()
        .id(runId.toString())
        .name(name)
        .project(langsmithProject)
        .runType(runType)
        .inputs(inputs)
        .startTime(OffsetDateTime.now())
        .build();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("x-api-key", langsmithApiKey);
    HttpEntity<AITracingRunRequest> entity = new HttpEntity<>(request, headers);
    restTemplate.postForEntity(langsmithApiUrl + "/runs", entity, Void.class);
  }

  public void patchRun(UUID runId, AITracingRunOutputs outputs) {
    if (!langsmithEnabled) {
      return;
    }

    AITracingRunPatchRequest request = AITracingRunPatchRequest.builder()
        .outputs(outputs)
        .endTime(OffsetDateTime.now())
        .build();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("x-api-key", langsmithApiKey);
    HttpEntity<AITracingRunPatchRequest> entity = new HttpEntity<>(request, headers);
    restTemplate.patchForObject(langsmithApiUrl + "/runs/" + runId, entity, Void.class);
  }
}
