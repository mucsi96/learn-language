package io.github.mucsi96.learnlanguage.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.azure.spring.cloud.autoconfigure.implementation.aad.security.AadResourceServerHttpSecurityConfigurer;

@Profile({"prod", "local"})
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfiguration {

    @Bean
    @Order(1)
    SecurityFilterChain dictionaryFilterChain(HttpSecurity http)
            throws Exception {

        http.securityMatcher("/dictionary");
        http.csrf(csrf -> csrf.disable());
        http.authorizeHttpRequests(requests -> requests.anyRequest().permitAll());

        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http.with(AadResourceServerHttpSecurityConfigurer.aadResourceServer(),
                Customizer.withDefaults());

        http.authorizeHttpRequests(requests -> requests
                .requestMatchers("/environment").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .anyRequest().authenticated());

        return http.build();
    }
}
