package io.github.mucsi96.learnlanguage.service;

final class ImagePromptBuilder {
  private ImagePromptBuilder() {
  }

  static String build(String input) {
    return "Create a photorealistic image for the following context: " + input + ". Avoid using text.";
  }
}
