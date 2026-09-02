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
 * one recorded by the tracing agent from its own test suite, so what it covers
 * is whatever those tests happened to touch. Registering the packages this
 * application and Spring AI actually use (chat completions, image generation,
 * audio transcription, and the shared types both sit on) removes the guesswork;
 * the rest of the SDK's 25k classes - assistants, realtime, evals, admin and
 * the beta surface - stay out of the image.
 *
 * xAI is reached through the same SDK pointed at a different base URL, so it
 * is covered here as well.
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
