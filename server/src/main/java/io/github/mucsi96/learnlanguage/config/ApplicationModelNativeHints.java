package io.github.mucsi96.learnlanguage.config;

import java.util.stream.Stream;

import org.springframework.aot.hint.BindingReflectionHintsRegistrar;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.util.ClassUtils;

/**
 * Binding metadata for this application's own Jackson-bound types.
 *
 * Controller request and response types are covered by Spring MVC's AOT
 * processing and JPA entities by Spring Data's. What neither sees are the types
 * bound outside a controller: the JSONB payloads Hypersistence serializes on
 * the way to the database ({@code CardData} and everything it embeds), the
 * types Spring AI's {@code BeanOutputConverter} builds a JSON schema from and
 * parses a model response into, and the records the services read third-party
 * REST responses into. The first group lives in the {@code model} package; the
 * other two are the records the services declare inside themselves. Both are
 * registered wholesale so a new response type never needs a hint of its own.
 *
 * {@link BindingReflectionHintsRegistrar} is what Spring itself uses for
 * {@code @RegisterReflectionForBinding}: it follows the property types of each
 * class, and knows what Jackson needs for records, enums with
 * {@code @JsonValue}/{@code @JsonCreator} and Lombok-generated accessors.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(ApplicationModelNativeHints.Registrar.class)
public class ApplicationModelNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String MODEL_PACKAGE = "io.github.mucsi96.learnlanguage.model";
    private static final String SERVICE_PACKAGE = "io.github.mucsi96.learnlanguage.service";

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      final Class<?>[] types = Stream.concat(
          ClassPathReflectionHints.classNames(MODEL_PACKAGE, (reader, factory) -> true),
          ClassPathReflectionHints.classNames(SERVICE_PACKAGE,
              (reader, factory) -> reader.getClassMetadata().getEnclosingClassName() != null))
          .map(name -> ClassUtils.resolveClassName(name, classLoader))
          .toArray(Class<?>[]::new);

      new BindingReflectionHintsRegistrar().registerReflectionHints(hints.reflection(), types);
    }
  }
}
