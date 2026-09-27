package com.foldpapper.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foldpapper.common.ApiErrorResponse;
import com.foldpapper.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Читает Bearer-токен и кладёт пользователя в SecurityContext.
 * Роль и блокировку берём из БД на каждый запрос (один запрос по PK):
 * так бан и снятие прав админа действуют сразу, а не после истечения токена.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            Claims claims = jwtService.parse(header.substring(BEARER_PREFIX.length()).trim());
            if (claims != null) {
                UUID userId = UUID.fromString(claims.getSubject());
                // удалённый пользователь просто становится гостем
                var state = userRepository.findAuthStateById(userId).orElse(null);
                if (state != null && state.getBannedAt() != null) {
                    // 401, а не 403: фронтенд на 401 сбрасывает токен и разлогинивает
                    writeBanned(request, response);
                    return;
                }
                if (state != null) {
                    AppUserPrincipal principal = new AppUserPrincipal(
                            userId, claims.get("username", String.class), null, state.getRole());
                    var authentication = new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private void writeBanned(HttpServletRequest request, HttpServletResponse response) throws IOException {
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), ApiErrorResponse.of(
                status.value(), status.getReasonPhrase(), "Аккаунт заблокирован", request.getRequestURI()));
    }
}
