package com.finsen.store.controller;

import com.finsen.store.dto.AuthRequest;
import com.finsen.store.dto.AuthResponse;
import com.finsen.store.entity.User;
import com.finsen.store.repository.UserRepository;
import com.finsen.store.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest authRequest) {
        String userId = authRequest.userId() != null ? authRequest.userId().trim() : "";
        String password = authRequest.password() != null ? authRequest.password().trim() : "";

        if (userId.isEmpty() || password.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "User ID and Password are required."));
        }

        // Exact database lookup by userId (case-insensitive)
        User user = userRepository.findByUserId(userId)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getUserId().equalsIgnoreCase(userId))
                        .findFirst()
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(400).body(Map.of("message", "Login failed. Invalid User ID or Password."));
        }

        // Strict password check (BCrypt or raw text)
        boolean passwordMatches = passwordEncoder.matches(password, user.getPassword()) 
                || password.equals(user.getPassword())
                || (user.getRawPassword() != null && user.getRawPassword().equals(password));

        if (!passwordMatches) {
            return ResponseEntity.status(400).body(Map.of("message", "Login failed. Invalid User ID or Password."));
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        return ResponseEntity.ok(new AuthResponse(
                jwt,
                user.getUserId(),
                user.getFullName(),
                user.getRole().name(),
                user.getLocation() != null ? user.getLocation().getId() : null,
                user.getLocation() != null ? user.getLocation().getName() : null
        ));
    }
}
