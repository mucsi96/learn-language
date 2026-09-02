package io.github.mucsi96.learnlanguage.config;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.OffsetTime;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Currency;
import java.util.Date;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.util.ClassUtils;

import jakarta.persistence.Entity;
import jakarta.persistence.metamodel.StaticMetamodel;

/**
 * The two things Hibernate reaches for reflectively that nothing else registers:
 * the generated static metamodel, and the array types.
 *
 * Hibernate populates the {@code Xyz_} classes the annotation processor
 * generates by writing their static fields itself, reflectively, while it builds
 * the metamodel. Without field access those fields stay null, and because a null
 * reads as a perfectly ordinary attribute argument the failure surfaces far
 * away, as a {@code NullPointerException} inside
 * {@code AbstractSqmPath.resolvePath} the first time a
 * {@code PredicateSpecification} builds a path - see the specifications in
 * {@code repository.specification}, which is where every query built from the
 * metamodel goes through.
 *
 * Array types Hibernate instantiates reflectively while building the entity
 * manager factory.
 *
 * For every Java type in the model Hibernate also resolves the corresponding
 * array type, and it builds it with {@code Array.newInstance}. An array class
 * that nothing in the application ever names is not in the image, so the
 * factory fails to start with
 * {@code MissingReflectionRegistrationError: Cannot reflectively instantiate the
 * array class 'java.util.UUID[]'} - one type at a time, each rebuild surfacing
 * the next.
 *
 * Registering an array class costs nothing but the class itself: no members are
 * requested, because {@code Array.newInstance} is all that is asked of it. So
 * both the JDK types Hibernate maps out of the box and every type an entity or
 * one of its superclasses declares - which is where the enums and the embedded
 * models come in - are registered up front, rather than waiting for a new field
 * to rediscover this during a deployment.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(HibernateNativeHints.Registrar.class)
public class HibernateNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String ENTITY_PACKAGE = "io.github.mucsi96.learnlanguage.entity";

    private static final Class<?>[] BASIC_TYPES = {
        boolean.class, byte.class, short.class, int.class, long.class,
        float.class, double.class, char.class,
        Boolean.class, Byte.class, Short.class, Integer.class, Long.class,
        Float.class, Double.class, Character.class, String.class,
        BigDecimal.class, BigInteger.class, UUID.class, Locale.class, Currency.class,
        Class.class, Date.class, java.sql.Date.class, java.sql.Time.class,
        java.sql.Timestamp.class, Duration.class, Instant.class, LocalDate.class,
        LocalTime.class, LocalDateTime.class, OffsetTime.class, OffsetDateTime.class,
        ZonedDateTime.class
    };

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      Stream.concat(Arrays.stream(BASIC_TYPES), entityFieldTypes(classLoader))
          .distinct()
          .forEach(type -> hints.reflection().registerType(type.arrayType()));

      scan(new AnnotationTypeFilter(StaticMetamodel.class)).stream()
          .map(BeanDefinition::getBeanClassName)
          .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name,
              MemberCategory.ACCESS_DECLARED_FIELDS));
    }

    private static Set<BeanDefinition> scan(AnnotationTypeFilter filter) {
      final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
          false) {
        @Override
        protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
          // The default rejects abstract types, and the generated metamodel
          // classes are all abstract - keeping the default silently finds none
          // of them, which is indistinguishable from having nothing to register.
          return true;
        }
      };
      scanner.addIncludeFilter(filter);
      return scanner.findCandidateComponents(ENTITY_PACKAGE);
    }

    private Stream<Class<?>> entityFieldTypes(ClassLoader classLoader) {
      return scan(new AnnotationTypeFilter(Entity.class)).stream()
          .map(BeanDefinition::getBeanClassName)
          .map(name -> ClassUtils.resolveClassName(name, classLoader))
          .flatMap(Registrar::fieldTypes);
    }

    /**
     * Up the class hierarchy, not just the entity itself: a field pulled into a
     * {@code @MappedSuperclass} is mapped exactly the same way, and reading only
     * the entity's own fields would quietly stop covering it.
     */
    private static Stream<Class<?>> fieldTypes(Class<?> type) {
      return Stream.<Class<?>>iterate(type, Objects::nonNull, Class::getSuperclass)
          .flatMap(clazz -> Arrays.stream(clazz.getDeclaredFields()))
          .map(Field::getType);
    }
  }
}
