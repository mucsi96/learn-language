package io.github.mucsi96.learnlanguage.config;

import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Reachability metadata for the request and response models of the Anthropic
 * and OpenAI SDKs.
 *
 * Both are written in Kotlin, and Spring AI hands their parameter objects to
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
 * Anthropic's SDK ships no native-image metadata at all (2.52.0), so it has to
 * be registered here. OpenAI's does, but it covers all 11k of its model
 * classes, most of them for APIs nothing here calls - the Responses, Realtime,
 * Evals and admin surfaces - and registering their members made the
 * native-image builder run out of memory on a 16GB runner. So that one file is
 * dropped from the build (see {@code --exclude-config} in pom.xml) and the
 * packages this application does call into are registered instead. Google's
 * GenAI SDK ships metadata that is scoped to what it needs and is left alone.
 *
 * Whole packages are registered rather than the classes that fail today, for
 * the reason given in {@link AzureNativeHints}: the next model the SDK reaches
 * for fails the same way, pointing nowhere near its cause. Reaching for a new
 * API of either SDK - the Responses API, say - means adding its package below,
 * and the failure if it is forgotten is the Kotlin one above.
 *
 * The scan reads bytecode rather than loading classes, and skips anonymous and
 * lambda classes. Both matter: Spring AI's own
 * {@code AiRuntimeHints.findJsonAnnotatedClassesInPackage} helper loads every
 * candidate, and loading one of those synthetic classes here
 * ({@code SseHandler$mapJson$1$handle$1}) throws
 * "This function has a reified type parameter and thus can only be inlined at
 * compilation time", which fails the build outright.
 *
 * Only the native image needs any of this. The AOT-on-JVM run described in
 * AGENTS.md cannot show the failure - reflection always works there.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(AiSdkNativeHints.Registrar.class)
public class AiSdkNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final List<String> PACKAGES = List.of(
        "com.anthropic.core",
        "com.anthropic.models.messages",
        "com.openai.core",
        "com.openai.models.audio",
        "com.openai.models.chat.completions",
        "com.openai.models.completions",
        "com.openai.models.images");

    /**
     * Scanned without its sub-packages: the shared request types live directly
     * in it, while everything below it belongs to an API nothing here calls.
     */
    private static final String OPENAI_MODELS = "com.openai.models";

    /** Anonymous and lambda classes: a {@code $} followed by a digit. */
    private static final Pattern SYNTHETIC = Pattern.compile("\\$\\d");

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
          false) {
        @Override
        protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
          // The default rejects abstract types, which is where the SDKs put
          // their unions - ContentBlock and friends are needed just as much.
          return true;
        }
      };
      scanner.addIncludeFilter((metadataReader, metadataReaderFactory) -> true);

      PACKAGES.forEach(pkg -> register(hints, classLoader, scanner, pkg, name -> true));
      register(hints, classLoader, scanner, OPENAI_MODELS,
          name -> name.lastIndexOf('.') == OPENAI_MODELS.length());
    }

    private void register(RuntimeHints hints, ClassLoader classLoader,
        ClassPathScanningCandidateComponentProvider scanner, String pkg,
        Predicate<String> accepted) {
      scanner.findCandidateComponents(pkg).stream()
          .map(BeanDefinition::getBeanClassName)
          .filter(name -> name != null && !SYNTHETIC.matcher(name).find())
          .filter(accepted)
          .forEach(name -> hints.reflection().registerTypeIfPresent(classLoader, name,
              MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
              MemberCategory.INVOKE_DECLARED_METHODS,
              MemberCategory.ACCESS_DECLARED_FIELDS));
    }
  }
}
