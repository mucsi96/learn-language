package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.core.type.filter.AssignableTypeFilter;

import liquibase.serializer.LiquibaseSerializable;

/**
 * Reachability metadata for the change types Liquibase reads reflectively.
 *
 * Everything Liquibase serializes - changes, their nested column and constraint
 * configurations, preconditions, SQL visitors - implements
 * {@link LiquibaseSerializable}, and it reads their properties by calling the
 * getters through {@code Method.invoke}. Spring Boot's own Liquibase hints
 * cover starting the migration but not that, so an unmigrated database happens
 * to work and a migrated one does not: applying a changeset needs none of it,
 * while recomputing the stored checksums of changesets already in
 * {@code databasechangelog} calls every getter of every change in the
 * changelog. The first deployment of an image therefore succeeds and its next
 * restart fails, with
 * {@code MissingReflectionRegistrationError: Cannot reflectively invoke method
 * ... AddForeignKeyConstraintChange.getDeferrable()}.
 *
 * Registering the whole hierarchy rather than the change types the changelog
 * uses today keeps a new changeset from reintroducing this - and it would
 * reintroduce it in production, on the restart after the deployment that
 * shipped it.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(LiquibaseNativeHints.Registrar.class)
public class LiquibaseNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String LIQUIBASE_PACKAGE = "liquibase";

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
          false) {
        @Override
        protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
          // The default rejects abstract types, and the getters are declared on
          // them as often as not - AbstractModifyDataChange.getCatalogName()
          // among them. Registering only the concrete change leaves those out,
          // because getDeclaredMethods() does not cross the class boundary.
          return true;
        }
      };
      scanner.addIncludeFilter(new AssignableTypeFilter(LiquibaseSerializable.class));

      scanner.findCandidateComponents(LIQUIBASE_PACKAGE).stream()
          .map(BeanDefinition::getBeanClassName)
          .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name,
              MemberCategory.INVOKE_DECLARED_CONSTRUCTORS, MemberCategory.INVOKE_DECLARED_METHODS));
    }
  }
}
