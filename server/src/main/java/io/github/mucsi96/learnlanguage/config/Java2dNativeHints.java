package io.github.mucsi96.learnlanguage.config;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.stream.Stream;

import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.ClassUtils;

/**
 * JNI metadata for Java2D, which PDF rendering and photo preprocessing run on.
 *
 * The rasterizer, image scaling and JPEG decoding live in the JDK's shared
 * libraries, and those reach back into Java through JNI: {@code libawt} looks
 * up {@code ShapeSpanIterator.pData} to fill a shape,
 * {@code RegionIterator.region} to clip it, {@code IntegerComponentRaster.data}
 * to touch pixels, and so on. GraalVM registers what AWT initialization needs,
 * not what the drawing pipelines look up on first use, so rendering a PDF page
 * fails with {@code NoSuchFieldError: sun.java2d.pipe.ShapeSpanIterator.pData}
 * at the first filled shape - after startup, only on the request that draws.
 *
 * The libraries reach most of those classes through objects rather than by
 * name, so no list derived from the libraries is complete: the Java2D packages
 * are registered wholesale, enumerated from the JDK's own {@code java.desktop}
 * module at build time. {@code native/java2d-jni-classes.txt} adds the classes
 * the libraries do look up by name outside those packages,
 * {@code java.lang.System} among them, and JNI resolves an inherited field
 * through the superclass, so each class is registered with its superclasses.
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(Java2dNativeHints.Registrar.class)
public class Java2dNativeHints {

  static class Registrar implements RuntimeHintsRegistrar {

    private static final String[] PACKAGES = {
        "java.awt",
        "java.awt.color",
        "java.awt.font",
        "java.awt.geom",
        "java.awt.image",
        "javax.imageio.plugins.jpeg",
        "com.sun.imageio.plugins.jpeg",
        "sun.awt",
        "sun.awt.geom",
        "sun.awt.image",
        "sun.font",
        "sun.java2d",
        "sun.java2d.cmm",
        "sun.java2d.cmm.lcms",
        "sun.java2d.loops",
        "sun.java2d.pipe"
    };

    private static final String CLASS_LIST = "native/java2d-jni-classes.txt";

    private static final MemberCategory[] CATEGORIES = {
        MemberCategory.ACCESS_DECLARED_FIELDS,
        MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
        MemberCategory.INVOKE_DECLARED_METHODS
    };

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
      Stream.concat(Arrays.stream(PACKAGES).flatMap(Registrar::classesOf), listedClasses())
          .map(name -> ClassUtils.resolveClassName(name, classLoader))
          .flatMap(Registrar::withSuperclasses)
          .distinct()
          .forEach(type -> hints.jni().registerType(type, CATEGORIES));
    }

    /** The classes directly in the package, read from the JDK's own module. */
    private static Stream<String> classesOf(String pkg) {
      final Path dir = FileSystems.getFileSystem(URI.create("jrt:/"))
          .getPath("/modules/java.desktop", pkg.replace('.', '/'));
      try {
        return Files.list(dir)
            .map(file -> file.getFileName().toString())
            .filter(name -> name.endsWith(".class") && !name.equals("package-info.class"))
            .map(name -> pkg + "." + name.substring(0, name.length() - ".class".length()));
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    private static Stream<String> listedClasses() {
      try {
        return new ClassPathResource(CLASS_LIST).getContentAsString(StandardCharsets.UTF_8).lines()
            .map(String::strip)
            .filter(line -> !line.isEmpty() && !line.startsWith("#"));
      } catch (IOException e) {
        throw new UncheckedIOException(e);
      }
    }

    private static Stream<Class<?>> withSuperclasses(Class<?> type) {
      return Stream.<Class<?>>iterate(type, current -> current != null && current != Object.class,
          Class::getSuperclass);
    }
  }
}
