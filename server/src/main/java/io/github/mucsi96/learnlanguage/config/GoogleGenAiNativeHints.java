package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the Google GenAI SDK's request and response types.
 *
 * The SDK serializes {@code com.google.genai.types} with its own Jackson
 * {@code ObjectMapper}: every type is an AutoValue class whose generated
 * {@code AutoValue_*} subclass and builder are named in
 * {@code @JsonDeserialize} annotations and instantiated reflectively. The SDK
 * ships metadata for the generated subclasses, but the abstract types
 * themselves are introspected as well - Jackson reads their accessors to
 * serialize a request - and that half is only partly covered by the
 * agent-recorded configuration next to it. Registering the whole package keeps
 * an SDK upgrade from reintroducing the gap one type at a time.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(GoogleGenAiNativeHints.Registrar.class)
public class GoogleGenAiNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints.registerPackages(hints, classLoader, "com.google.genai.types");
    }
  }
}
