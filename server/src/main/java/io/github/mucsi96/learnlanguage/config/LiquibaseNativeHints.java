package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the Liquibase change types the changelog uses.
 *
 * Liquibase computes a changeset's checksum by serializing each change, and
 * it serializes a change by invoking the getter of every parameter its
 * {@code ChangeMetaData} lists - {@code Method.invoke}, on the concrete change
 * class. The GraalVM reachability-metadata repository does carry a
 * configuration for liquibase-core, but its per-class method lists were
 * recorded by the tracing agent from a changelog that is not this one:
 * {@code AddForeignKeyConstraintChange} is in there with six getters and
 * without {@code getBaseTableSchemaName}, so the first foreign key in this
 * changelog fails validation at startup with a
 * {@code MissingReflectionRegistrationError}, after the database connection
 * and before any table is touched.
 *
 * Registering every change, precondition and column configuration type rather
 * than the getters missing today means a new change type in a future
 * changeset needs nothing. The SQL generators are found through
 * {@code ServiceLoader} and instantiated reflectively, so they are included
 * for the same reason.
 *
 * The AOT-on-JVM run described in AGENTS.md cannot show this - reflection
 * always works there. Nor does the e2e pod's readiness probe make it visible
 * before the pod times out: the server exits during context refresh and the
 * reason is only in the container log.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(LiquibaseNativeHints.Registrar.class)
public class LiquibaseNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      ClassPathReflectionHints.registerPackages(hints, classLoader,
          "liquibase.change",
          "liquibase.precondition",
          "liquibase.sqlgenerator.core",
          "liquibase.sql.visitor");
    }
  }
}
