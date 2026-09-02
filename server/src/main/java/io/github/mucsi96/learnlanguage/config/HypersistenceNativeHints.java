package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the Hypersistence types behind the JSONB columns.
 *
 * Hibernate instantiates a {@code @Type(JsonBinaryType.class)} user type by
 * looking up its constructor reflectively, first the one taking a
 * {@code TypeBootstrapContext}, then the no-arg one. Without metadata neither
 * lookup finds anything and the entity manager factory fails with "No
 * appropriate constructor for type JsonBinaryType" at startup, right after the
 * Liquibase update. The Hypersistence jar ships native-image metadata, but
 * only for the PostgreSQL {@code PGobject} it writes through, not for its own
 * types. The whole type package is registered so that switching a column to
 * another of its types needs nothing.
 *
 * {@link JacksonCloningJsonSerializer} is instantiated by Hypersistence from
 * the class name in {@code application.yml}, so its constructor is registered
 * as well.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(HypersistenceNativeHints.Registrar.class)
public class HypersistenceNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints.registerPackages(hints, classLoader, "io.hypersistence.utils.hibernate.type");
      hints.reflection().registerType(JacksonCloningJsonSerializer.class, MemberCategory.INVOKE_DECLARED_CONSTRUCTORS);
    }
  }
}
