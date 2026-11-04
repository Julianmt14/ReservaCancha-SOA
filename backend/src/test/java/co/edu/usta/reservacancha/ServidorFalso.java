package co.edu.usta.reservacancha;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Proveedor de mentiras para probar los clientes HTTP sin Spring: un servidor del JDK en un puerto
 * libre que guarda lo que recibe y contesta lo que se le indique.
 */
final class ServidorFalso implements AutoCloseable {

  record Solicitud(String metodo, String ruta, Headers headers, String cuerpo) {}

  private final HttpServer server;
  private final List<Solicitud> recibidas = new CopyOnWriteArrayList<>();
  private volatile int estado = 200;
  private volatile String respuesta = "{}";

  ServidorFalso() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        ex -> {
          String cuerpo = new String(ex.getRequestBody().readAllBytes(), UTF_8);
          recibidas.add(
              new Solicitud(
                  ex.getRequestMethod(),
                  ex.getRequestURI().toString(),
                  ex.getRequestHeaders(),
                  cuerpo));
          ex.getResponseHeaders().set("Content-Type", "application/json");
          if (estado == 204) {
            ex.sendResponseHeaders(204, -1);
          } else {
            byte[] b = respuesta.getBytes(UTF_8);
            ex.sendResponseHeaders(estado, b.length);
            ex.getResponseBody().write(b);
          }
          ex.close();
        });
    server.start();
  }

  void responder(int estado, String json) {
    this.estado = estado;
    this.respuesta = json;
  }

  String url() {
    return "http://127.0.0.1:" + server.getAddress().getPort();
  }

  Solicitud ultima() {
    return recibidas.get(recibidas.size() - 1);
  }

  @Override
  public void close() {
    server.stop(0);
  }

  /** URL de un puerto donde no hay nadie escuchando (proveedor apagado). */
  static String urlApagada() throws IOException {
    try (ServerSocket s = new ServerSocket(0)) {
      return "http://localhost:" + s.getLocalPort();
    }
  }
}
