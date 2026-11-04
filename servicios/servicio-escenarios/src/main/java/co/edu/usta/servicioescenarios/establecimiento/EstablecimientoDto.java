package co.edu.usta.servicioescenarios.establecimiento;

public record EstablecimientoDto(
    Long id, String nombre, String direccion, String ciudad, String telefono) {

  public static EstablecimientoDto de(Establecimiento e) {
    return new EstablecimientoDto(
        e.getId(), e.getNombre(), e.getDireccion(), e.getCiudad(), e.getTelefono());
  }
}
