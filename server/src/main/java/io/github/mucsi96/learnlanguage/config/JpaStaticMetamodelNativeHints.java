package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the JPA static metamodel.
 *
 * {@code hibernate-processor} generates a {@code Card_} next to every entity,
 * and Hibernate fills in its attribute constants at startup by locating the
 * class by name and setting its static fields reflectively. Spring's JPA AOT
 * support registers the entities but not their metamodel companions, and
 * Hibernate treats a metamodel class it cannot reach as absent, at debug
 * level. Every constant then stays {@code null}, and the first Criteria query
 * that passes one to {@code root.get(...)} fails with a bare
 * {@link NullPointerException} inside Hibernate's SQM path resolution - the
 * bulk updates in the custom repository implementations and every
 * {@code Specification} in this application do exactly that.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(JpaStaticMetamodelNativeHints.Registrar.class)
public class JpaStaticMetamodelNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String ENTITY_PACKAGE = "io.github.mucsi96.learnlanguage.entity";

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints
          .classNames(ENTITY_PACKAGE, (reader, factory) -> reader.getClassMetadata().getClassName().endsWith("_"))
          .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name,
              MemberCategory.ACCESS_DECLARED_FIELDS));
    }
  }
}
