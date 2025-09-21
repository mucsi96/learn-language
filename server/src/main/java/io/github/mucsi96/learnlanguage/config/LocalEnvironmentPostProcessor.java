package io.github.mucsi96.learnlanguage.config;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import com.azure.identity.DefaultAzureCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.security.keyvault.secrets.SecretClient;
import com.azure.security.keyvault.secrets.SecretClientBuilder;
import com.azure.security.keyvault.secrets.models.KeyVaultSecret;

@Order(Ordered.HIGHEST_PRECEDENCE)
public class LocalEnvironmentPostProcessor implements EnvironmentPostProcessor {

  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    if (!"local".equals(environment.getProperty("spring.profiles.active"))) {
      return;
    }

    DefaultAzureCredential credential = new DefaultAzureCredentialBuilder().build();
    SecretClient secretClient = new SecretClientBuilder()
        .vaultUrl("https://p05.vault.azure.net/")
        .credential(credential)
        .buildClient();

    Map<String, Object> properties = new LinkedHashMap<>();

    properties.put("SPRING_ACTUATOR_PORT", "8082");
    properties.put("DB_USERNAME", getSecretValue(secretClient, "db-username"));
    properties.put("DB_PASSWORD", getSecretValue(secretClient, "db-password"));
    properties.put("DB_HOSTNAME", "localhost");
    properties.put("DB_PORT", "5461");
    properties.put("DB_NAME", "postgres1");
    properties.put("AZURE_TENANT_ID", getSecretValue(secretClient, "tenant-id"));
    properties.put("AZURE_CLIENT_ID", getSecretValue(secretClient, "learn-language-api-client-id"));
    properties.put("AZURE_CLIENT_SECRET", getSecretValue(secretClient, "learn-language-api-client-secret"));
    properties.put("UI_CLIENT_ID", getSecretValue(secretClient, "learn-language-spa-client-id"));
    properties.put("OPENAI_API_KEY", getSecretValue(secretClient, "learn-language-openai-api-key"));
    properties.put("STORAGE_ACCOUNT_BLOB_URL", "https://ibari.blob.core.windows.net/");
    properties.put("STORAGE_ACCOUNT_CONTAINER_NAME", "learn-language");
    properties.put("LANGSMITH_API_KEY", getSecretValue(secretClient, "learn-language-langsmith-api-key"));
    properties.put("GOOGLE_AI_API_KEY", getSecretValue(secretClient, "learn-language-google-ai-api-key"));
    properties.put("ELEVEN_LABS_API_KEY", getSecretValue(secretClient, "learn-language-eleven-labs-api-key"));

    environment.getPropertySources().addFirst(new MapPropertySource("myProps", properties));
  }

  private String getSecretValue(SecretClient secretClient, String secretName) {
    KeyVaultSecret secret = secretClient.getSecret(secretName);
    return secret.getValue();
  }
}
