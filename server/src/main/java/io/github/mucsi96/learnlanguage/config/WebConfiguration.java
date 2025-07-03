package io.github.mucsi96.learnlanguage.config;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class WebConfiguration {

    @Bean
    OncePerRequestFilter spaRoutingForwardFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
                String mode = request.getHeader("Sec-Fetch-Mode");

                if (mode != null && mode.equals("navigate")) {
                    RequestDispatcher rd = request.getRequestDispatcher("/");
                    rd.forward(request, response);
                } else {
                    filterChain.doFilter(request, response);
                }
            }
        };
    }
}
