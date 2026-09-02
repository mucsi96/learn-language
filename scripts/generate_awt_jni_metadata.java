// Regenerates the JNI reachability metadata the native image needs for headless
// AWT and ImageIO. See "Native image and the baked-in Spring profile" in
// AGENTS.md for why it exists, and run it whenever the JDK the container build
// uses changes:
//
//   java scripts/generate_awt_jni_metadata.java \
//     server/src/main/resources/META-INF/native-image/io.github.mucsi96/learnlanguage-awt/reachability-metadata.json
//
// The include and exclude lists below are the whole rule: everything in
// java.desktop that headless image work can reach, minus the display, printing
// and clipboard packages that a server never loads. Widening the excludes is
// how the file shrinks; the cost of getting it wrong is an UnsatisfiedLink-like
// failure deep inside the AWT native libraries at runtime, not a build error.
//
// It also emits the ICC colour profiles java.desktop carries as module
// resources. ICC_Profile loads them by name, so without them a colour
// conversion - rendering any CMYK PDF page, say - fails at runtime with
// "CMMException: Invalid profile: null" from inside LCMS.

import java.io.*;
import java.lang.module.*;
import java.util.*;
import java.util.stream.*;

public class generate_awt_jni_metadata {
  static final List<String> INCLUDE = List.of(
      "java.awt.", "javax.imageio.", "com.sun.imageio.", "sun.awt.", "sun.java2d.", "sun.font.");
  static final List<String> EXCLUDE = List.of(
      "sun.awt.X11", "sun.awt.windows", "sun.awt.wl", "sun.awt.screencast", "sun.awt.datatransfer",
      "sun.awt.shell", "sun.awt.im.", "sun.awt.dnd", "sun.java2d.opengl", "sun.java2d.xr",
      "sun.java2d.x11", "sun.java2d.metal", "sun.java2d.vulkan", "sun.java2d.d3d",
      "java.awt.dnd", "java.awt.desktop", "java.awt.im.", "java.awt.print", "java.awt.datatransfer");
  static final List<String> CORE = List.of(
      "java.lang.System", "java.lang.Runtime", "java.lang.ClassLoader", "java.lang.String",
      "java.lang.Class", "java.lang.Object", "java.lang.Thread", "java.lang.Integer",
      "java.lang.Boolean", "java.lang.Long", "java.lang.Double", "java.lang.Float",
      "java.lang.Byte", "java.lang.Short", "java.lang.Character", "java.io.File",
      "java.io.InputStream", "java.io.OutputStream", "java.util.HashMap", "java.util.ArrayList",
      "java.util.Vector", "java.util.Properties", "java.lang.Error", "java.lang.Exception",
      "java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.OutOfMemoryError",
      "java.lang.InternalError", "java.lang.IllegalArgumentException",
      "java.lang.ArrayIndexOutOfBoundsException", "java.io.IOException",
      "java.lang.reflect.Method", "java.lang.reflect.Field");

  public static void main(String[] a) throws Exception {
    ModuleReference ref = ModuleFinder.ofSystem().find("java.desktop").orElseThrow();
    List<String> types;
    try (ModuleReader r = ref.open()) {
      types = r.list()
          .filter(n -> n.endsWith(".class") && !n.equals("module-info.class"))
          .map(n -> n.substring(0, n.length() - 6).replace('/', '.'))
          .filter(n -> INCLUDE.stream().anyMatch(n::startsWith))
          .filter(n -> EXCLUDE.stream().noneMatch(n::startsWith))
          .collect(Collectors.toList());
    }
    types.addAll(CORE);
    Collections.sort(types);

    final List<String> resources;
    try (ModuleReader r = ref.open()) {
      resources = r.list().filter(n -> n.startsWith("sun/java2d/cmm/profiles/")).sorted()
          .collect(Collectors.toList());
    }

    System.err.println("types: " + types.size() + ", resources: " + resources.size());
    try (PrintWriter w = new PrintWriter(a[0])) {
      w.println("{");
      w.println("  \"jni\": [");
      w.println(types.stream()
          .map(t -> "    {\n      \"type\": \"" + t + "\",\n      \"allDeclaredFields\": true,\n"
              + "      \"allDeclaredMethods\": true,\n      \"allDeclaredConstructors\": true\n    }")
          .collect(Collectors.joining(",\n")));
      w.println("  ],");
      w.println("  \"resources\": [");
      w.println(resources.stream()
          .map(n -> "    {\n      \"module\": \"java.desktop\",\n      \"glob\": \"" + n + "\"\n    }")
          .collect(Collectors.joining(",\n")));
      w.println("  ]");
      w.println("}");
    }
  }
}
