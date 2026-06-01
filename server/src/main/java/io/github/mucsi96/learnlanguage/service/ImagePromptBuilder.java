package io.github.mucsi96.learnlanguage.service;

final class ImagePromptBuilder {
  private ImagePromptBuilder() {
  }

  static String build(String input, String context) {
    final String contextSegment = context == null || context.isBlank()
        ? ""
        : " Additional context: " + context + ".";
    return "Create a photorealistic image for the following context: " + input + "."
        + contextSegment + " Avoid using text.";
  }
}
