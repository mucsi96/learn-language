package io.github.mucsi96.learnlanguage.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.aot.hint.TypeHint;

/**
 * The registrars scan packages by name, and a package that no longer exists
 * after an SDK upgrade registers nothing without complaint. The native image
 * then fails at the first call to that SDK, forty minutes into a build. This
 * pins one type per package that has to come out of each scan.
 */
class NativeHintsTest {

  @Test
  void anthropicModelsAreRegistered() {
    assertThat(registeredTypes(new AnthropicNativeHints.Registrar()))
        .contains("com.anthropic.models.messages.MessageParam", "com.anthropic.core.JsonField");
  }

  @Test
  void openAiModelsAreRegistered() {
    assertThat(registeredTypes(new OpenAiNativeHints.Registrar()))
        .contains("com.openai.models.chat.completions.ChatCompletionCreateParams",
            "com.openai.models.images.ImageGenerateParams",
            "com.openai.models.audio.transcriptions.TranscriptionCreateParams",
            "com.openai.models.ChatModel",
            "com.openai.core.JsonField")
        .noneMatch(name -> name.startsWith("com.openai.models.beta"));
  }

  @Test
  void azureModelsIncludeAbstractTypes() {
    assertThat(registeredTypes(new AzureNativeHints.Registrar()))
        .contains("com.azure.core.util.ExpandableStringEnum", "com.azure.json.JsonSerializable")
        .anyMatch(name -> name.startsWith("com.azure.identity"));
  }

  @Test
  void applicationModelsAndServiceRecordsAreRegistered() {
    assertThat(registeredTypes(new ApplicationModelNativeHints.Registrar()))
        .contains("io.github.mucsi96.learnlanguage.model.CardData",
            "io.github.mucsi96.learnlanguage.model.ExampleData",
            "io.github.mucsi96.learnlanguage.service.SentenceTranslationService$SentenceTranslationResponse");
  }

  @Test
  void liquibaseChangeTypesAreRegistered() {
    assertThat(registeredTypes(new LiquibaseNativeHints.Registrar()))
        .contains("liquibase.change.core.AddForeignKeyConstraintChange",
            "liquibase.change.core.CreateTableChange",
            "liquibase.change.ColumnConfig",
            "liquibase.precondition.core.TableExistsPrecondition",
            "liquibase.sqlgenerator.core.AddForeignKeyConstraintGenerator");
  }

  @Test
  void hypersistenceTypesAreRegistered() {
    assertThat(registeredTypes(new HypersistenceNativeHints.Registrar()))
        .contains("io.hypersistence.utils.hibernate.type.json.JsonBinaryType",
            "io.hypersistence.utils.hibernate.type.util.ObjectMapperWrapper",
            "io.github.mucsi96.learnlanguage.config.JacksonCloningJsonSerializer");
  }

  @Test
  void jpaStaticMetamodelIsRegistered() {
    assertThat(registeredTypes(new JpaStaticMetamodelNativeHints.Registrar()))
        .contains("io.github.mucsi96.learnlanguage.entity.Card_",
            "io.github.mucsi96.learnlanguage.entity.ChatModelSetting_")
        .noneMatch(name -> name.equals("io.github.mucsi96.learnlanguage.entity.Card"));
  }

  @Test
  void keyVaultPropertiesAreRegistered() {
    assertThat(registeredTypes(new KeyVaultPropertySourceNativeHints.Registrar()))
        .contains(
            "com.azure.spring.cloud.autoconfigure.implementation.keyvault.secrets.properties.AzureKeyVaultSecretProperties",
            "com.azure.spring.cloud.autoconfigure.implementation.keyvault.secrets.properties.AzureKeyVaultPropertySourceProperties");
  }

  @Test
  void classPathResourcesAreRegistered() {
    final RuntimeHints hints = new RuntimeHints();
    new ClassPathResourceNativeHints.Registrar().registerHints(hints, getClass().getClassLoader());

    final Stream<String> patterns = hints.resources().resourcePatternHints()
        .flatMap(hint -> hint.getIncludes().stream())
        .map(pattern -> pattern.getPattern());
    assertThat(patterns).contains("fonts/*.ttf", "org/apache/pdfbox/resources/**");
  }

  private Set<String> registeredTypes(RuntimeHintsRegistrar registrar) {
    final RuntimeHints hints = new RuntimeHints();
    registrar.registerHints(hints, getClass().getClassLoader());
    return hints.reflection().typeHints()
        .map(TypeHint::getType)
        .map(type -> type.getName())
        .collect(Collectors.toSet());
  }
}
