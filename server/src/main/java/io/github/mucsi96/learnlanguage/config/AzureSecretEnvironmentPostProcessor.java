
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
public class AzureSecretEnvironmentPostProcessor implements EnvironmentPostProcessor {

  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    String activeProfile = environment.getProperty("spring.profiles.active");
    if (!"local".equals(activeProfile) && !"prod".equals(activeProfile)) {
      return;
    }

    DefaultAzureCredential credential = new DefaultAzureCredentialBuilder().build();
    SecretClient secretClient = new SecretClientBuilder()
        .vaultUrl("https://p06.vault.azure.net/")
        .credential(credential)
        .buildClient();

    Map<String, Object> properties = new LinkedHashMap<>();

    if ("local".equals(activeProfile)) {
      properties.put("AZURE_TENANT_ID", getSecretValue(secretClient, "tenant-id"));
      properties.put("AZURE_CLIENT_ID", getSecretValue(secretClient, "learn-language-api-client-id"));
      properties.put("AZURE_CLIENT_SECRET", getSecretValue(secretClient, "learn-language-api-client-secret"));
    } else if ("prod".equals(activeProfile)) {
      properties.put("DB_USERNAME", getSecretValue(secretClient, "db-username"));
      properties.put("DB_PASSWORD", getSecretValue(secretClient, "db-password"));
    }
    properties.put("UI_CLIENT_ID", getSecretValue(secretClient, "learn-language-spa-client-id"));
    properties.put("OPENAI_API_KEY", getSecretValue(secretClient, "learn-language-openai-api-key"));
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
