package io.github.mucsi96.learnlanguage.config;

import java.util.stream.Stream;

import org.springframework.aot.hint.MemberCategory;
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
 *
 * Excluding the SDK's metadata also drops the handful of Jackson 2 classes it
 * listed: the serializer {@code @JsonSerialize(using = NullSerializer.class)}
 * names on its multipart fields, which Jackson instantiates by constructor,
 * the Java 7 support classes it looks up by name, {@code TypeReference}, and
 * the annotation types whose attributes Kotlin reflection reads. Without the
 * first, every audio transcription fails with "NullSerializer has no default
 * (no arg) constructor". They are registered here instead.
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
      Stream.of(
          "com.fasterxml.jackson.databind.ser.std.NullSerializer",
          "com.fasterxml.jackson.databind.ext.Java7HandlersImpl",
          "com.fasterxml.jackson.databind.ext.Java7SupportImpl",
          "com.fasterxml.jackson.core.type.TypeReference",
          "com.fasterxml.jackson.annotation.JsonAnyGetter",
          "com.fasterxml.jackson.annotation.JsonAnySetter",
          "com.fasterxml.jackson.annotation.JsonCreator",
          "com.fasterxml.jackson.annotation.JsonProperty")
          .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name,
              MemberCategory.INVOKE_DECLARED_CONSTRUCTORS, MemberCategory.INVOKE_DECLARED_METHODS));
    }
  }
}
