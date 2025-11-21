package io.github.mucsi96.learnlanguage.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;

@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializationConfig implements ApplicationRunner {

  private final DataSource dataSource;
  private final JdbcTemplate jdbcTemplate;

  @Override
  public void run(ApplicationArguments args) {
    if (!schemaExists()) {
      log.info("Database schema not found. Initializing database with init.sql...");
      initializeDatabase();
      log.info("Database initialization completed successfully.");
    } else {
      log.debug("Database schema already exists. Skipping initialization.");
    }
  }

  private boolean schemaExists() {
    try {
      Integer count = jdbcTemplate.queryForObject(
          "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?",
          Integer.class,
          "learn_language"
      );
      return count != null && count > 0;
    } catch (Exception e) {
      log.warn("Error checking schema existence: {}", e.getMessage());
      return false;
    }
  }

  private void initializeDatabase() {
    try {
      ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
      populator.addScript(new ClassPathResource("init.sql"));
      populator.setSeparator(";");
      populator.execute(dataSource);
    } catch (Exception e) {
      log.error("Failed to initialize database", e);
      throw new RuntimeException("Database initialization failed", e);
    }
  }
}
