package io.github.mucsi96.learnlanguage.config;

import java.io.IOException;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
final class MutationOriginFilter extends OncePerRequestFilter {
  private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
  private final String appOrigin;

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return SAFE_METHODS.contains(request.getMethod())
        || request.getServletPath().equals("/test/cleanup-storage");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    if (!appOrigin.equals(request.getHeader("Origin"))) {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      return;
    }
    chain.doFilter(request, response);
  }
}
