package io.github.mucsi96.learnlanguage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import io.github.mucsi96.learnlanguage.config.DatabaseStartupInitializer;

@SpringBootApplication
@EnableAsync
public class LearnLanguageApplication {

	public static void main(String[] args) {
		final SpringApplication app = new SpringApplication(LearnLanguageApplication.class);
		app.addInitializers(new DatabaseStartupInitializer());
		app.run(args);
	}
}
