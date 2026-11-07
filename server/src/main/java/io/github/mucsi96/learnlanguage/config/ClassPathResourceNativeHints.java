package io.github.mucsi96.learnlanguage.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Classpath resources read at runtime that nothing registers on its own.
 *
 * A native image only carries the resources something asked for at build
 * time. Spring Boot registers its configuration files and the Liquibase
 * change log; the fonts the study-session PDF embeds and the data PDFBox and
 * FontBox load lazily while parsing and rendering documents (glyph lists,
 * AFM metrics for the standard 14 fonts, CMaps, the ICC profile, the fallback
 * TrueType font) are read with a plain class loader and would otherwise be
 * missing, failing the first PDF operation with an {@code IOException} about a
 * resource that plainly exists in the jar.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(ClassPathResourceNativeHints.Registrar.class)
public class ClassPathResourceNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      hints.resources()
          .registerPattern("fonts/*.ttf")
          .registerPattern("org/apache/pdfbox/resources/**")
          .registerPattern("org/apache/fontbox/cmap/*")
          .registerPattern("org/apache/fontbox/unicode/*");
    }
  }
}
