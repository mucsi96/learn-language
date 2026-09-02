package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.BindingReflectionHintsRegistrar;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.util.ClassUtils;

/**
 * Binding metadata for the application's own model types.
 *
 * The framework's AOT processing covers what it can see being bound: controller
 * request and response types, entities, repository projections. It cannot see a
 * type that only ever passes through the {@code JsonMapper} bean - and several
 * services build their user message that way, serializing a request model to
 * JSON by hand before handing it to the model. Without members, Jackson sees a
 * type with no properties and writes {@code {}}, so the prompt goes out empty
 * and the reply is whatever the model makes of an empty question. Nothing
 * fails; the answers just quietly stop being about anything. {@code
 * TranslationRequest} and {@code DictionaryRequest} were reaching the model that
 * way.
 *
 * The whole package is registered rather than the two types that were wrong,
 * because the next service to serialize a model by hand would reintroduce this
 * with no compile-time signal and no error at runtime either. These are small
 * POJOs; registering all of them costs little beyond what binding a handful of
 * them already does. Response types that live next to their service rather than
 * here still carry {@code @RegisterReflectionForBinding} at the call site.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(ModelBindingNativeHints.Registrar.class)
public class ModelBindingNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String MODEL_PACKAGE = "io.github.mucsi96.learnlanguage.model";

    private final BindingReflectionHintsRegistrar bindingRegistrar = new BindingReflectionHintsRegistrar();

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
          false) {
        @Override
        protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
          // Abstract bases carry properties their subtypes bind through them.
          return true;
        }
      };
      scanner.addIncludeFilter((metadataReader, metadataReaderFactory) -> true);

      scanner.findCandidateComponents(MODEL_PACKAGE).stream()
          .map(BeanDefinition::getBeanClassName)
          .map(name -> ClassUtils.resolveClassName(name, classLoader))
          .forEach(type -> bindingRegistrar.registerReflectionHints(hints.reflection(), type));
    }
  }
}
