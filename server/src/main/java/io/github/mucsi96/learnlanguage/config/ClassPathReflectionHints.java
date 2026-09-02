package io.github.mucsi96.learnlanguage.config;

import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.TypeFilter;

/**
 * Registers every class of a package for reflection, for libraries that bind
 * their models with Jackson (or Kotlin reflection on top of it) and ship no
 * native-image metadata of their own.
 *
 * Whole packages are registered rather than the classes that fail today: the
 * next model such a library reaches for fails the same way, with a stack trace
 * pointing nowhere near its cause.
 *
 * The scan reads bytecode rather than loading classes, and skips anonymous and
 * lambda classes. Both matter for the Kotlin SDKs: Spring AI's own
 * {@code AiRuntimeHints.findJsonAnnotatedClassesInPackage} helper loads every
 * candidate, and loading one of those synthetic classes
 * ({@code SseHandler$mapJson$1$handle$1}) throws "This function has a reified
 * type parameter and thus can only be inlined at compilation time", which fails
 * the build outright.
 */
final class ClassPathReflectionHints {

  /** Anonymous and lambda classes: a {@code $} followed by a digit. */
  private static final Pattern SYNTHETIC = Pattern.compile("\\$\\d");

  private static final MemberCategory[] CATEGORIES = {
      MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
      MemberCategory.INVOKE_DECLARED_METHODS,
      MemberCategory.ACCESS_DECLARED_FIELDS
  };

  private ClassPathReflectionHints() {
  }

  private static final TypeFilter EVERY_CLASS = (metadataReader, metadataReaderFactory) -> true;

  /** Every class in the packages and their sub-packages. */
  static void registerPackages(RuntimeHints hints, ClassLoader classLoader, String... packages) {
    Arrays.stream(packages)
        .flatMap(pkg -> classNames(pkg, "**/*.class", EVERY_CLASS))
        .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name, CATEGORIES));
  }

  /** Only the classes directly in the package, none of its sub-packages. */
  static void registerTopLevelPackage(RuntimeHints hints, ClassLoader classLoader, String pkg) {
    classNames(pkg, "*.class", EVERY_CLASS)
        .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name, CATEGORIES));
  }

  /** Names of the classes in the package and its sub-packages that the filter accepts. */
  static Stream<String> classNames(String pkg, TypeFilter filter) {
    return classNames(pkg, "**/*.class", filter);
  }

  private static Stream<String> classNames(String pkg, String resourcePattern, TypeFilter filter) {
    final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
        false) {
      @Override
      protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
        // The default rejects abstract types and interfaces, which is where
        // the SDKs put their unions - ContentBlock and friends are needed
        // just as much.
        return true;
      }
    };
    scanner.setResourcePattern(resourcePattern);
    scanner.addIncludeFilter(filter);

    return scanner.findCandidateComponents(pkg).stream()
        .map(BeanDefinition::getBeanClassName)
        .filter(Objects::nonNull)
        .filter(name -> !SYNTHETIC.matcher(name).find());
  }
}
