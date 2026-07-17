package io.github.mucsi96.learnlanguage.config;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String SOURCE_ID_ATTRIBUTE = "sourceId";

    private static final String REQUIRED_ROLE = "DeckCreator";
    private static final String REQUIRED_SCOPE = "createDeck";

    private final JwtDecoder jwtDecoder;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes) {
        final Map<String, String> params = parseQuery(request.getURI().getQuery());
        final String token = params.get("token");
        final String sourceId = params.get(SOURCE_ID_ATTRIBUTE);

        if (token == null || sourceId == null) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        final Jwt jwt;
        try {
            jwt = jwtDecoder.decode(token);
        } catch (JwtException e) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        if (!hasDeckCreatorAuthority(jwt)) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }

        attributes.put(SOURCE_ID_ATTRIBUTE, sourceId);
        return true;
    }

    private boolean hasDeckCreatorAuthority(Jwt jwt) {
        final List<String> roles = jwt.getClaimAsStringList("roles");
        final boolean hasRole = roles != null && roles.contains(REQUIRED_ROLE);

        final String scopeClaim = jwt.getClaimAsString("scp") != null
                ? jwt.getClaimAsString("scp")
                : jwt.getClaimAsString("scope");
        final boolean hasScope = scopeClaim != null
                && Arrays.asList(scopeClaim.split(" ")).contains(REQUIRED_SCOPE);

        return hasRole && hasScope;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception) {
    }

    private Map<String, String> parseQuery(String query) {
        if (query == null || query.isBlank()) {
            return Map.of();
        }
        return Arrays.stream(query.split("&"))
                .map(pair -> pair.split("=", 2))
                .filter(parts -> parts.length == 2)
                .collect(Collectors.toMap(
                        parts -> URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                        parts -> URLDecoder.decode(parts[1], StandardCharsets.UTF_8),
                        (existing, replacement) -> existing));
    }
}
