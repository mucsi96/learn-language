package io.github.mucsi96.learnlanguage.config;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;

import org.springframework.aot.hint.BindingReflectionHintsRegistrar;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.aot.hint.TypeReference;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.core.type.filter.AssignableTypeFilter;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;

/**
 * Reachability metadata for the {@code jsonb} columns.
 *
 * Two separate gaps, both invisible on the JVM:
 *
 * Hibernate instantiates the type named by {@code @Type} reflectively, so
 * without its constructors {@link JsonBinaryType} cannot be built and the
 * entity manager factory fails to start with
 * {@code InstantiationException: No appropriate constructor for type}. Nothing
 * in the AOT processing sees that name - it is an annotation value Hibernate
 * resolves itself.
 *
 * That type builds its {@code ObjectMapper} in a static initializer that looks
 * for Kotlin on the classpath and, finding it - the Anthropic and OpenAI SDKs
 * put it there - loads its own {@code KotlinObjectMapperBuilder} by name. Only
 * by name, so nothing pulls the class into the image and the initializer dies
 * with {@code ClassNotFoundException}. Registering it keeps the image on the
 * same mapper the JVM build already uses; leaving it out is not an option,
 * because the lookup is not conditional on anything this application controls.
 *
 * And the value of such a column is read and written by that
 * {@code ObjectMapper}, which the entity metadata says nothing about either. Without members in the image the mapper sees a
 * type with no properties: writing a card produces {@code {}} and silently
 * drops its contents, reading gives back an object with every field null.
 * {@link CardData} is the only such payload with a structure of its own -
 * {@code WordImportCandidate.examples} is a {@code List<String>}. The registrar
 * follows the property types it reaches, so the nested models come with it.
 *
 * Jackson is not the only thing reading these, though. Hibernate takes a deep
 * copy of every mapped attribute for the dirty-checking snapshot, and
 * hypersistence implements that for a json column by round-tripping the value
 * through <em>Java</em> serialization whenever it implements
 * {@link Serializable} - which {@code CardData} and everything it holds do. A
 * native image resolves serialization constructors at build time, so without
 * that metadata reading a single card fails with
 * {@code UnsupportedFeatureError: SerializationConstructorAccessor class not
 * found for declaringClass: ... CardData}. The whole model package is scanned
 * rather than naming the four types that qualify today, and the JDK collections
 * Jackson instantiates for the {@code List} and {@code Map} fields are
 * registered alongside them, since the snapshot walks those too.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(JsonbNativeHints.Registrar.class)
public class JsonbNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String KOTLIN_OBJECT_MAPPER_BUILDER = "io.hypersistence.utils.hibernate.type.util.KotlinObjectMapperBuilder";

    private static final String MODEL_PACKAGE = "io.github.mucsi96.learnlanguage.model";

    /** What Jackson instantiates for the payloads' {@code List} and {@code Map} fields. */
    private static final List<Class<? extends Serializable>> SNAPSHOT_COLLECTIONS = List.of(
        ArrayList.class, LinkedHashMap.class, HashMap.class);

    private final BindingReflectionHintsRegistrar bindingRegistrar = new BindingReflectionHintsRegistrar();

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      hints.reflection().registerType(JsonBinaryType.class,
          MemberCategory.INVOKE_DECLARED_CONSTRUCTORS);
      hints.reflection().registerTypeIfPresent(classLoader, KOTLIN_OBJECT_MAPPER_BUILDER,
          MemberCategory.INVOKE_DECLARED_CONSTRUCTORS, MemberCategory.INVOKE_DECLARED_METHODS);
      bindingRegistrar.registerReflectionHints(hints.reflection(), CardData.class);

      final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
          false);
      scanner.addIncludeFilter(new AssignableTypeFilter(Serializable.class));
      scanner.findCandidateComponents(MODEL_PACKAGE).stream()
          .map(BeanDefinition::getBeanClassName)
          .map(TypeReference::of)
          .forEach(hints.serialization()::registerType);

      SNAPSHOT_COLLECTIONS.forEach(hints.serialization()::registerType);
    }
  }
}
