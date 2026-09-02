package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the Anthropic SDK's request and response models.
 *
 * The SDK is written in Kotlin, and Spring AI hands its parameter objects to
 * the SDK's own Jackson {@code ObjectMapper}, which has
 * {@code jackson-module-kotlin} registered. For a Kotlin class that module does
 * not read the constructor with plain Java reflection: it asks
 * {@code ReflectJvmMapping} to map the Kotlin constructor back to a
 * {@code java.lang.reflect.Constructor}. In a native image without metadata
 * that mapping finds nothing, and rather than a missing-reflection error it
 * fails as
 *
 * <pre>
 * KotlinReflectionInternalError: Could not compute caller for function:
 *     fun &lt;init&gt;(JsonField&lt;Long&gt;, JsonField&lt;List&lt;MessageParam&gt;&gt;, ...)
 * </pre>
 *
 * thrown while serializing the request body - so the symptom is every call to
 * the model failing at request time, with a stack trace naming Kotlin's
 * reflection internals rather than anything that is missing.
 *
 * Neither the Anthropic SDK nor spring-ai-anthropic ships native-image metadata
 * (2.52.0 / 2.0.1), so an application that wants a native image has to register
 * it. {@code com.anthropic.models.beta} is left out deliberately - two thirds of
 * the SDK's classes, and nothing here calls the beta API.
 *
 * Only the native image needs any of this. The AOT-on-JVM run described in
 * AGENTS.md cannot show the failure - reflection always works there.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(AnthropicNativeHints.Registrar.class)
public class AnthropicNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints.registerPackages(hints, classLoader,
          "com.anthropic.models.messages",
          "com.anthropic.core");
    }
  }
}
