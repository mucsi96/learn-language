package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the OpenAI SDK's request and response models.
 *
 * The SDK comes from the same generator as the Anthropic one and is Kotlin
 * too, so it fails the same way in a native image - see
 * {@link AnthropicNativeHints}. It does ship a {@code reflect-config.json}, but
 * one recorded by the tracing agent from its own test suite: twelve thousand
 * classes, most of them the assistants, responses, realtime, evals and admin
 * surfaces nothing here calls, plus the Gradle and JUnit internals the agent
 * saw along the way. Every registered class is reachable, so that file alone
 * pushes the image builder past the memory a CI runner has. The build therefore
 * excludes the SDK's own metadata ({@code --exclude-config} in
 * {@code pom.xml}) and registers here exactly the packages this application
 * and Spring AI use: chat completions, image generation, audio transcription,
 * and the shared types they sit on.
 *
 * xAI is reached through the same SDK pointed at a different base URL, so it
 * is covered here as well. The Google GenAI SDK needs nothing of the kind: its
 * metadata is generated per type alongside the AutoValue classes and is
 * complete.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(OpenAiNativeHints.Registrar.class)
public class OpenAiNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints.registerPackages(hints, classLoader,
          "com.openai.models.chat",
          "com.openai.models.images",
          "com.openai.models.audio",
          "com.openai.core");
      ClassPathReflectionHints.registerTopLevelPackage(hints, classLoader, "com.openai.models");
    }
  }
}
