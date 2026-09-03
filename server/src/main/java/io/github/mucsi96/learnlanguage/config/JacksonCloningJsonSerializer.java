package io.github.mucsi96.learnlanguage.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.TypeFactory;

import io.hypersistence.utils.hibernate.type.util.JsonSerializer;
import io.hypersistence.utils.hibernate.type.util.ObjectMapperWrapper;

/**
 * Deep-copies JSONB column values through Jackson instead of Java
 * serialization.
 *
 * Hypersistence clones every JSONB value it loads, so that Hibernate can tell
 * later whether the entity changed it, and its default serializer does that
 * with {@code SerializationHelper.clone}, i.e. Java serialization, for any
 * value that implements {@code Serializable} - and refuses any value that does
 * not. A native image only supports Java serialization for classes registered
 * for it, transitively down to the {@code ArrayList} and {@code LinkedHashMap}
 * inside, and any collection the application builds with {@code List.of} or
 * {@code stream().toList()} adds another class to that list. So instead the
 * copy goes out through Jackson and back in: the same round trip the value
 * already survives on its way to and from the database.
 *
 * Wired in with {@code hypersistence.utils.json.serializer} in
 * {@code application.yml}; Hypersistence instantiates it by class name, which
 * is why {@link HypersistenceNativeHints} registers its constructor.
 */
public final class JacksonCloningJsonSerializer implements JsonSerializer {

  private final ObjectMapper objectMapper = ObjectMapperWrapper.INSTANCE.getObjectMapper();

  @Override
  public <T> T clone(T value) {
    if (value == null || value instanceof String) {
      return value;
    }
    try {
      return objectMapper.readValue(objectMapper.writeValueAsString(value), cloneType(value));
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Cannot clone JSON value of type " + value.getClass().getName(), e);
    }
  }

  /**
   * Collections and maps come back as the mutable {@code ArrayList} and
   * {@code LinkedHashMap} Jackson builds for {@code List} and {@code Map},
   * whatever implementation the application handed over. Their runtime class
   * says nothing about the element type, so it is taken from the first
   * element, the way Hypersistence's own serializer does: a JSONB column
   * holds one kind of value, and a column declared as {@code List<Record>}
   * has to come back as records, not as the maps Jackson would otherwise
   * build. That is as deep as the inference goes. A column declared as a
   * collection of collections, or a map of them, would get its inner values
   * back as Jackson's generic lists and maps; declare such a column as a
   * model class instead, whose fields carry their types.
   */
  private JavaType cloneType(Object value) {
    final TypeFactory types = objectMapper.getTypeFactory();
    if (value instanceof Collection<?> collection) {
      return types.constructCollectionType(List.class, elementType(collection.stream()));
    }
    if (value instanceof Map<?, ?> map) {
      return types.constructMapType(Map.class, types.constructType(String.class), elementType(map.values().stream()));
    }
    return types.constructType(value.getClass());
  }

  private JavaType elementType(Stream<?> elements) {
    final TypeFactory types = objectMapper.getTypeFactory();
    return elements
        .filter(Objects::nonNull)
        .findFirst()
        .map(element -> types.constructType(element.getClass()))
        .orElseGet(() -> types.constructType(Object.class));
  }
}
