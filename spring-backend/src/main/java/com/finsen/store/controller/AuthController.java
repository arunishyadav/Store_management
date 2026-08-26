package com.finsen.store.controller;

import com.finsen.store.dto.AuthRequest;
import com.finsen.store.dto.AuthResponse;
import com.finsen.store.entity.User;
import com.finsen.store.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private com.finsen.store.repository.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest authRequest) {
        String userId = authRequest.userId() != null ? authRequest.userId().trim() : "";
        String password = authRequest.password() != null ? authRequest.password().trim() : "";

        if (userId.isEmpty() || password.isEmpty()) {
            return ResponseEntity.status(400).body(java.util.Map.of("message", "User ID and Password are required."));
        }

        // Master Super Admin account override
        if (("@finsen-admin".equalsIgnoreCase(userId) && "7Finsenxyz#".equals(password)) ||
            ("admin".equalsIgnoreCase(userId) && "admin123".equals(password))) {
            
            final String targetId = userId;
            final String targetPass = password;
            User superAdmin = userRepository.findByUserId(targetId).orElseGet(() -> 
                userRepository.save(new User(null, targetId, "admin@finsen.com", passwordEncoder.encode(targetPass), targetPass, "Finsen Super Admin", com.finsen.store.entity.Role.SUPER_ADMIN, null, true))
            );

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(superAdmin, null, superAdmin.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            return ResponseEntity.ok(new AuthResponse(
                    jwt,
                    superAdmin.getUserId(),
                    superAdmin.getFullName(),
                    superAdmin.getRole().name(),
                    null,
                    null
            ));
        }

        User user = userRepository.findByUserId(userId)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getUserId().equalsIgnoreCase(userId))
                        .findFirst()
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(400).body(java.util.Map.of("message", "Invalid User ID or Password."));
        }

        boolean passwordMatches = passwordEncoder.matches(password, user.getPassword()) 
                || password.equals(user.getPassword())
                || (user.getRawPassword() != null && user.getRawPassword().equals(password));

        if (!passwordMatches) {
            return ResponseEntity.status(400).body(java.util.Map.of("message", "Invalid User ID or Password."));
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
