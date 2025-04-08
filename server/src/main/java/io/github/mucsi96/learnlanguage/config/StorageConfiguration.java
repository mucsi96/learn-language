package io.github.mucsi96.learnlanguage.config;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.azure.core.credential.TokenCredential;
import com.azure.core.http.netty.NettyAsyncHttpClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;

import io.github.mucsi96.learnlanguage.test.MockAzuriteTokenCredential;
import io.github.mucsi96.learnlanguage.test.SSLContextUtil;
import io.netty.handler.ssl.SslContext;
import lombok.extern.slf4j.Slf4j;
import reactor.netty.http.client.HttpClient;

@Configuration
@Slf4j
public class StorageConfiguration {
    @Value("${blobstorage.accountUrl}")
    private String accountUrl;

    @Profile("test")
    @Bean
    public BlobServiceClient testBlobServiceClient() throws Exception {

        TokenCredential tokenCredential = new MockAzuriteTokenCredential();
        SslContext sslContext = SSLContextUtil
                .createSSLContext("/certs/rootCA.pem");

        var httpClient = new NettyAsyncHttpClientBuilder(
                HttpClient.create().secure(sslContextSpec -> sslContextSpec
                        .sslContext(sslContext)))
                .build();

        BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
                .endpoint(accountUrl).credential(tokenCredential)
                .httpClient(httpClient).buildClient();

        return blobServiceClient;
    }

    @Profile({ "prod", "local" })
    @Bean
    public BlobServiceClient prodBlobServiceClient() throws Exception {

        TokenCredential tokenCredential = new DefaultAzureCredentialBuilder()
                .build();

        BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
                .endpoint(accountUrl).credential(tokenCredential).buildClient();

        return blobServiceClient;
    }

    @Bean
    public DateTimeFormatter backupDateTimeFormat() {
        return DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(ZoneOffset.UTC);
    }
}
