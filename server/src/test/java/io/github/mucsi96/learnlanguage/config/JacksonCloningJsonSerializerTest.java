package io.github.mucsi96.learnlanguage.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import io.hypersistence.utils.hibernate.type.util.JsonConfiguration;
import io.hypersistence.utils.hibernate.type.util.ObjectMapperWrapper;

class JacksonCloningJsonSerializerTest {

  private final JacksonCloningJsonSerializer serializer = new JacksonCloningJsonSerializer();

  /**
   * The property name is only ever read by Hypersistence, so a typo in
   * application.yml would leave the default, Java-serializing, serializer in
   * place without a word - and fail in the native image only.
   */
  @Test
  void hypersistenceInstallsTheSerializerFromTheConfiguredProperty() {
    final ObjectMapperWrapper wrapper = new JsonConfiguration(Map.of(
        "hypersistence.utils.json.serializer", JacksonCloningJsonSerializer.class.getName()))
        .getObjectMapperWrapper();

    assertThat(ReflectionTestUtils.getField(wrapper, "jsonSerializer"))
        .isInstanceOf(JacksonCloningJsonSerializer.class);
  }

  @Test
  void clonesAModelValueDeeply() {
    final CardData original = CardData.builder()
        .word("aber")
        .translation(Map.of("en", "but"))
        .examples(List.of(ExampleData.builder().de("Aber nein").build()))
        .build();

    final CardData copy = serializer.clone(original);

    assertThat(copy).isEqualTo(original).isNotSameAs(original);
    assertThat(copy.getExamples().get(0)).isNotSameAs(original.getExamples().get(0));
  }

  @Test
  void clonesImmutableCollectionsIntoMutableOnes() {
    final List<String> copy = serializer.clone(List.of("a", "b"));

    assertThat(copy).isEqualTo(List.of("a", "b")).isInstanceOf(ArrayList.class);
  }
}
