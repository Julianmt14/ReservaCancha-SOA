package co.edu.usta.reservacancha.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** La página pública queda en "/" y el panel del personal en "/panel" (resources/static). */
@Configuration
public class PaginasWeb implements WebMvcConfigurer {

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    registry.addViewController("/panel").setViewName("forward:/panel.html");
  }
}
