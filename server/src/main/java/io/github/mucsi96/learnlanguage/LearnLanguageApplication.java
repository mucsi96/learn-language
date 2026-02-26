package io.github.mucsi96.learnlanguage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LearnLanguageApplication {

	public static void main(String[] args) {
		SpringApplication.run(LearnLanguageApplication.class, args);
	}
}
