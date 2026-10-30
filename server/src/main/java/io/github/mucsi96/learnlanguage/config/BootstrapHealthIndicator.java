package io.github.mucsi96.learnlanguage.config;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.web.server.context.WebServerInitializedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component("bootstrap")
public class BootstrapHealthIndicator implements HealthIndicator {
  private static final Duration TIMEOUT = Duration.ofSeconds(3);
  private static final Duration MAX_AGE = Duration.ofSeconds(45);

  private final HttpClient client = HttpClient.newBuilder()
      .connectTimeout(TIMEOUT)
      .followRedirects(HttpClient.Redirect.NEVER)
      .build();
  private final AtomicReference<URI> endpoint = new AtomicReference<>();
  private final AtomicReference<ProbeResult> result = new AtomicReference<>();

  @EventListener
  public void onWebServerInitialized(WebServerInitializedEvent event) {
    if (event.getApplicationContext().getServerNamespace() != null) {
      return;
    }
    final String contextPath = event.getApplicationContext().getEnvironment()
        .getProperty("server.servlet.context-path", "");
    endpoint.set(URI.create("http://127.0.0.1:" + event.getWebServer().getPort()
        + contextPath + "/environment"));
  }

  @Scheduled(fixedDelay = 15_000)
  public void probe() {
    final URI uri = endpoint.get();
    if (uri == null) {
      return;
    }
    result.set(new ProbeResult(check(uri), Instant.now()));
  }

  private Health check(URI uri) {
    try {
      final HttpRequest request = HttpRequest.newBuilder(uri).timeout(TIMEOUT).GET().build();
      // Exercise the HTTP handler and serialization, including native Errors that become HTTP 500.
      final HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
      return (response.statusCode() == 200 ? Health.up() : Health.down())
          .withDetail("httpStatus", response.statusCode()).build();
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      return Health.down().withDetail("reason", "Bootstrap probe interrupted").build();
    } catch (Exception exception) {
      return Health.down().withDetail("reason", exception.getClass().getSimpleName()).build();
    }
  }

  @Override
  public Health health() {
    final ProbeResult latest = result.get();
    if (latest == null) {
      return Health.down().withDetail("reason", "Bootstrap has not been checked yet").build();
    }
    if (latest.checkedAt().plus(MAX_AGE).isBefore(Instant.now())) {
      return Health.down().withDetail("reason", "Bootstrap check is stale").build();
    }
    return latest.health();
  }

  private record ProbeResult(Health health, Instant checkedAt) {}
}
