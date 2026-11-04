package co.edu.usta.servicioreservas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.usta.servicioreservas.reserva.BloqueReservado;
import co.edu.usta.servicioreservas.reserva.BloqueReservadoRepository;
import co.edu.usta.servicioreservas.reserva.EstadoReserva;
import co.edu.usta.servicioreservas.reserva.Reserva;
import co.edu.usta.servicioreservas.reserva.ReservaRepository;
import co.edu.usta.servicioreservas.reserva.ReservaService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Pregunta de la docente: ¿qué pasa si dos usuarios seleccionan la misma cancha y horario al mismo
 * tiempo? Diez usuarios piden a la vez la cancha 9001 de 21:00 a 22:00: solo una solicitud gana;
 * las otras nueve reciben 409 porque la restricción UNIQUE de bloques_reservados lo impide.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConcurrenciaReservasTest {

  private static final int SOLICITUDES = 10;
  private static final long CANCHA = 9001;

  @Autowired ReservaService service;
  @Autowired ReservaRepository reservas;
  @Autowired BloqueReservadoRepository bloques;

  @Test
  void diezSolicitudesSimultaneasParaElMismoHorarioSoloCreanUnaReserva() throws Exception {
    LocalDate fecha = LocalDate.now().plusDays(10);
    LocalTime inicio = LocalTime.of(21, 0);
    LocalTime fin = LocalTime.of(22, 0);

    ExecutorService hilos = Executors.newFixedThreadPool(SOLICITUDES);
    CountDownLatch listos = new CountDownLatch(SOLICITUDES);
    CountDownLatch salida = new CountDownLatch(1);
    AtomicInteger creadas = new AtomicInteger();
    AtomicInteger conflictos = new AtomicInteger();
    AtomicInteger porUnique = new AtomicInteger();
    ConcurrentLinkedQueue<Throwable> inesperados = new ConcurrentLinkedQueue<>();

    for (int i = 0; i < SOLICITUDES; i++) {
      long usuario = 700 + i;
      hilos.submit(
          () -> {
            listos.countDown();
            try {
              salida.await(); // todos arrancan al mismo tiempo
              service.crear(usuario, CANCHA, fecha, inicio, fin, new BigDecimal("90000"));
              creadas.incrementAndGet();
            } catch (ResponseStatusException e) {
              if (e.getStatusCode() == HttpStatus.CONFLICT) {
                conflictos.incrementAndGet();
                if (e.getCause() instanceof DataIntegrityViolationException) {
                  porUnique.incrementAndGet(); // pasó la consulta previa y lo frenó la base
                }
              } else {
                inesperados.add(e);
              }
            } catch (Throwable e) {
              inesperados.add(e);
            }
          });
    }
    assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
    salida.countDown();
    hilos.shutdown();
    assertThat(hilos.awaitTermination(60, TimeUnit.SECONDS)).isTrue();

    System.out.printf(
        "Concurrencia: %d creada, %d conflictos (%d frenados por la UNIQUE, %d por la consulta"
            + " previa)%n",
        creadas.get(), conflictos.get(), porUnique.get(), conflictos.get() - porUnique.get());
    assertThat(inesperados).isEmpty();
    assertThat(creadas.get()).isEqualTo(1);
    assertThat(conflictos.get()).isEqualTo(SOLICITUDES - 1);

    // En la base queda una sola reserva activa, con sus dos bloques; las perdedoras se revirtieron
    // completas (ninguna reserva quedó guardada sin sus bloques).
    List<Reserva> activas =
        reservas.findByCanchaIdAndFechaAndEstadoNotOrderByHoraInicioAsc(
            CANCHA, fecha, EstadoReserva.CANCELADA);
    assertThat(activas).hasSize(1);
    assertThat(reservas.findByCanchaIdOrderByFechaAscHoraInicioAscIdAsc(CANCHA)).hasSize(1);
    List<BloqueReservado> ocupados =
        bloques.findByCanchaIdAndFechaOrderByHoraInicioAsc(CANCHA, fecha);
    assertThat(ocupados)
        .extracting(BloqueReservado::getHoraInicio)
        .containsExactly(LocalTime.of(21, 0), LocalTime.of(21, 30));
    assertThat(bloques.countByReservaId(activas.get(0).getId())).isEqualTo(2);
  }

  /**
   * Aun saltándose la consulta previa (insertando directo con el repositorio), la base de datos no
   * acepta un segundo bloque para la misma cancha, fecha y hora: eso es lo que garantiza la regla.
   */
  @Test
  void laRestriccionUniqueRechazaUnBloqueRepetidoAunqueNadieConsulteAntes() {
    long cancha = 9002;
    LocalDate fecha = LocalDate.now().plusDays(11);
    Reserva primera = reservas.saveAndFlush(reserva(cancha, fecha));
    bloques.saveAndFlush(new BloqueReservado(primera, LocalTime.of(21, 0)));

    Reserva segunda = reservas.saveAndFlush(reserva(cancha, fecha));
    assertThatThrownBy(
            () -> bloques.saveAndFlush(new BloqueReservado(segunda, LocalTime.of(21, 0))))
        .isInstanceOf(DataIntegrityViolationException.class);

    reservas.delete(segunda); // limpieza: esta prueba insertó sin pasar por ReservaService
    assertThat(bloques.findByCanchaIdAndFechaOrderByHoraInicioAsc(cancha, fecha)).hasSize(1);
  }

  private static Reserva reserva(long cancha, LocalDate fecha) {
    Reserva r = new Reserva();
    r.setUsuarioId(1L);
    r.setCanchaId(cancha);
    r.setFecha(fecha);
    r.setHoraInicio(LocalTime.of(21, 0));
    r.setHoraFin(LocalTime.of(21, 30));
    r.setValorTotal(new BigDecimal("30000.00"));
    r.setEstado(EstadoReserva.PENDIENTE);
    return r;
  }
}
