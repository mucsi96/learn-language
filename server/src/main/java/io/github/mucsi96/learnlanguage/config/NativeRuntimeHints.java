package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.BindingReflectionHintsRegistrar;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.util.ClassUtils;

/**
 * Registers reflection metadata the GraalVM native image cannot discover
 * statically: every class in the model package is serialized or bound
 * reflectively (Jackson via the JSONB entity columns, response schema
 * generation and parsing in BeanOutputConverter), and the PDF fonts are
 * loaded from the classpath at runtime.
 */
public class NativeRuntimeHints implements RuntimeHintsRegistrar {

    private static final String MODEL_PACKAGE = "io.github.mucsi96.learnlanguage.model";

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.resources().registerPattern("fonts/*");

        final BindingReflectionHintsRegistrar bindingRegistrar = new BindingReflectionHintsRegistrar();

        final ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
                false) {
            @Override
            protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
                return true;
            }
        };
        scanner.addIncludeFilter((metadataReader, metadataReaderFactory) -> true);

        scanner.findCandidateComponents(MODEL_PACKAGE).stream()
                .map(beanDefinition -> ClassUtils.resolveClassName(beanDefinition.getBeanClassName(), classLoader))
                .forEach(type -> {
                    bindingRegistrar.registerReflectionHints(hints.reflection(), type);
                    hints.reflection().registerType(type,
                            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                            MemberCategory.INVOKE_DECLARED_METHODS,
                            MemberCategory.ACCESS_DECLARED_FIELDS);
                });
    }
}
