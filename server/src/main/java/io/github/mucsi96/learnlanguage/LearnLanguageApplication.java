package io.github.mucsi96.learnlanguage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;

@SpringBootApplication
public class LearnLanguageApplication {

	public static void main(String[] args) {
		String activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
		if ("local".equals(activeProfile)) {
			try {
				new ProcessBuilder("kubectl", "port-forward", "services/postgres1",
						System.getenv("DB_PORT") + ":http",
						"--kubeconfig", "../.kube/db-config",
						"--namespace", "db")
						.inheritIO()
						.start();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		SpringApplication.run(LearnLanguageApplication.class, args);

	}

}
