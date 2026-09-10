package io.github.mucsi96.learnlanguage.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetSocketAddress;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import com.sun.net.httpserver.HttpServer;

import io.netty.handler.timeout.ReadTimeoutException;

class AIConfigurationTest {

  @Test
  void configuresIdeogramReadTimeout() throws Exception {
    final HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
    server.createContext("/", exchange -> {
      try (exchange) {
        Thread.sleep(250);
        exchange.sendResponseHeaders(204, -1);
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
      }
    });
    server.start();

    try {
      final String baseUrl = "http://localhost:" + server.getAddress().getPort();
      final var restClient = new AIConfiguration(null).ideogramRestClient(
          "api-key", baseUrl, Duration.ofSeconds(1), Duration.ofMillis(50));

      assertThatThrownBy(() -> restClient.get().uri("/").retrieve().toBodilessEntity())
          .isInstanceOf(ResourceAccessException.class)
          .hasRootCauseInstanceOf(ReadTimeoutException.class);
      Thread.sleep(250);
    } finally {
      server.stop(0);
    }
  }
}
