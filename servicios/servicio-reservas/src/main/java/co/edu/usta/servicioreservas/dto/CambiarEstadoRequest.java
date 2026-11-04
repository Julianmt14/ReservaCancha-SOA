package co.edu.usta.servicioreservas.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo del PATCH de estado: {"estado": "PAGADA"} o {"estado": "CANCELADA"}. */
public record CambiarEstadoRequest(@NotBlank String estado) {}
