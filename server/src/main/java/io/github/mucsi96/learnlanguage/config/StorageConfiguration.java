package io.github.mucsi96.learnlanguage.config;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.azure.core.credential.TokenCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;

import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class StorageConfiguration {
  @Value("${blobstorage.accountUrl}")
  private String accountUrl;

    @Profile("test")
    @Bean
    BlobServiceClient testBlobServiceClient(@Value("${blobstorage.connectionString}") String connectionString)
            throws Exception {

    return new BlobServiceClientBuilder().connectionString(connectionString)
        .buildClient();
  }

    @Profile({"prod", "local"})
    @Bean
    BlobServiceClient prodBlobServiceClient() throws Exception {

    TokenCredential tokenCredential = new DefaultAzureCredentialBuilder()
        .build();

    BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
        .endpoint(accountUrl).credential(tokenCredential).buildClient();

    return blobServiceClient;
  }

    @Bean
    DateTimeFormatter backupDateTimeFormat() {
    return DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
        .withZone(ZoneOffset.UTC);
  }
}
