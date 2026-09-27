package com.foldpapper.user;

import com.foldpapper.common.ApiException;
import com.foldpapper.security.AppUserPrincipal;
import com.foldpapper.security.JwtService;
import com.foldpapper.user.dto.UserDtos.AuthResponse;
import com.foldpapper.user.dto.UserDtos.LoginRequest;
import com.foldpapper.user.dto.UserDtos.RegisterRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       UserService userService,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw ApiException.conflict("Такой username уже занят");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Такой email уже зарегистрирован");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(StringUtils.hasText(request.displayName()) ? request.displayName().trim() : username);
        userRepository.save(user);

        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.login().trim(), request.password()));
        } catch (AuthenticationException ex) {
            throw new BadCredentialsException("Неверный логин или пароль");
        }
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return buildResponse(userService.requireById(principal.getId()));
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.issueToken(user.getId(), user.getUsername());
        return new AuthResponse(token, "Bearer", jwtService.accessTokenTtlSeconds(), userService.toResponse(user));
    }
}
