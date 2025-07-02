package io.github.mucsi96.learnlanguage.tracing;

import java.util.UUID;

import com.openai.client.OpenAIClient;
import com.openai.client.OpenAIClientAsync;
import com.openai.core.RequestOptions;
import com.openai.core.http.StreamResponse;
import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionChunk;
import com.openai.models.chat.completions.ChatCompletionCreateParams;
import com.openai.models.chat.completions.ChatCompletionDeleteParams;
import com.openai.models.chat.completions.ChatCompletionDeleted;
import com.openai.models.chat.completions.ChatCompletionListPage;
import com.openai.models.chat.completions.ChatCompletionListParams;
import com.openai.models.chat.completions.ChatCompletionRetrieveParams;
import com.openai.models.chat.completions.ChatCompletionUpdateParams;
import com.openai.services.blocking.AudioService;
import com.openai.services.blocking.BatchService;
import com.openai.services.blocking.BetaService;
import com.openai.services.blocking.ChatService;
import com.openai.services.blocking.CompletionService;
import com.openai.services.blocking.ContainerService;
import com.openai.services.blocking.EmbeddingService;
import com.openai.services.blocking.EvalService;
import com.openai.services.blocking.FileService;
import com.openai.services.blocking.FineTuningService;
import com.openai.services.blocking.GraderService;
import com.openai.services.blocking.ImageService;
import com.openai.services.blocking.ModelService;
import com.openai.services.blocking.ModerationService;
import com.openai.services.blocking.ResponseService;
import com.openai.services.blocking.UploadService;
import com.openai.services.blocking.VectorStoreService;
import com.openai.services.blocking.chat.ChatCompletionService;
import com.openai.services.blocking.chat.completions.MessageService;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class TracebleOpenAIClient implements OpenAIClient {
  private final OpenAIClient delegate;
  private final AITracingService tracingService;

  @Override
  public OpenAIClientAsync async() {
    throw new UnsupportedOperationException("Unimplemented method 'async'");
  }

  @Override
  public AudioService audio() {
    throw new UnsupportedOperationException("Unimplemented method 'audio'");
  }

  @Override
  public BatchService batches() {
    throw new UnsupportedOperationException("Unimplemented method 'batches'");
  }

  @Override
  public BetaService beta() {
    throw new UnsupportedOperationException("Unimplemented method 'beta'");
  }

  @Override
  public ChatService chat() {
    return new TracebleChatService(delegate.chat(), tracingService);
  }

  @Override
  public void close() {
    throw new UnsupportedOperationException("Unimplemented method 'close'");
  }

  @Override
  public CompletionService completions() {
    throw new UnsupportedOperationException("Unimplemented method 'completions'");
  }

  @Override
  public ContainerService containers() {
    throw new UnsupportedOperationException("Unimplemented method 'containers'");
  }

  @Override
  public EmbeddingService embeddings() {
    throw new UnsupportedOperationException("Unimplemented method 'embeddings'");
  }

  @Override
  public EvalService evals() {
    throw new UnsupportedOperationException("Unimplemented method 'evals'");
  }

  @Override
  public FileService files() {
    throw new UnsupportedOperationException("Unimplemented method 'files'");
  }

  @Override
  public FineTuningService fineTuning() {
    throw new UnsupportedOperationException("Unimplemented method 'fineTuning'");
  }

  @Override
  public GraderService graders() {
    throw new UnsupportedOperationException("Unimplemented method 'graders'");
  }

  @Override
  public ImageService images() {
    return delegate.images();
  }

  @Override
  public ModelService models() {
    throw new UnsupportedOperationException("Unimplemented method 'models'");
  }

  @Override
  public ModerationService moderations() {
    throw new UnsupportedOperationException("Unimplemented method 'moderations'");
  }

  @Override
  public ResponseService responses() {
    throw new UnsupportedOperationException("Unimplemented method 'responses'");
  }

  @Override
  public UploadService uploads() {
    throw new UnsupportedOperationException("Unimplemented method 'uploads'");
  }

  @Override
  public VectorStoreService vectorStores() {
    throw new UnsupportedOperationException("Unimplemented method 'vectorStores'");
  }

  @Override
  public WithRawResponse withRawResponse() {
    throw new UnsupportedOperationException("Unimplemented method 'withRawResponse'");
  }

}

@RequiredArgsConstructor
class TracebleChatService implements ChatService {
  private final ChatService delegate;
  private final AITracingService tracingService;

  @Override
  public ChatCompletionService completions() {
    return new TracebleChatCompletionService(delegate.completions(), tracingService);
  }

  @Override
  public WithRawResponse withRawResponse() {
    throw new UnsupportedOperationException("Unimplemented method 'withRawResponse'");
  }
}

@RequiredArgsConstructor
class TracebleChatCompletionService implements ChatCompletionService {
  private final ChatCompletionService delegate;
  private final AITracingService tracingService;

  @Override
  public ChatCompletion create(ChatCompletionCreateParams params, RequestOptions options) {
    UUID runId = UUID.randomUUID();

    var messages = params.messages().stream()
        .map(AITracingMessage::from)
        .toList();

    tracingService.postRun(runId, "ChatOpenAI", AITracingRunType.llm, AITracingRunInputs.builder()
        .messages(messages)
        .model(params.model().toString())
        .temperature(params.temperature().orElse(null))
        .build());

    var result = delegate.create(params, options);
    var choices = result.choices().stream()
        .map(AITracingChoice::from)
        .toList();
    tracingService.patchRun(runId, AITracingRunOutputs.builder()
        .choices(choices)
        .build());
    return result;
  }

  @Override
  public StreamResponse<ChatCompletionChunk> createStreaming(ChatCompletionCreateParams arg0, RequestOptions arg1) {
    throw new UnsupportedOperationException("Unimplemented method 'createStreaming'");
  }

  @Override
  public ChatCompletionDeleted delete(ChatCompletionDeleteParams arg0, RequestOptions arg1) {
    throw new UnsupportedOperationException("Unimplemented method 'delete'");
  }

  @Override
  public ChatCompletionListPage list(ChatCompletionListParams arg0, RequestOptions arg1) {
    throw new UnsupportedOperationException("Unimplemented method 'list'");
  }

  @Override
  public MessageService messages() {
    throw new UnsupportedOperationException("Unimplemented method 'messages'");
  }

  @Override
  public ChatCompletion retrieve(ChatCompletionRetrieveParams arg0, RequestOptions arg1) {
    throw new UnsupportedOperationException("Unimplemented method 'retrieve'");
  }

  @Override
  public ChatCompletion update(ChatCompletionUpdateParams arg0, RequestOptions arg1) {
    throw new UnsupportedOperationException("Unimplemented method 'update'");
  }

  @Override
  public WithRawResponse withRawResponse() {
    throw new UnsupportedOperationException("Unimplemented method 'withRawResponse'");
  }
}
