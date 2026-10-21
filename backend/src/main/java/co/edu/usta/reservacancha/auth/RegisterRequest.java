package co.edu.usta.reservacancha.auth;

import co.edu.usta.reservacancha.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(max = 100) String nombre,
    @Email @NotBlank String email,
    // BCrypt solo usa los primeros 72 bytes: se limita para no aceptar claves truncadas en silencio
    @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        String password,
    Role rol) {}
