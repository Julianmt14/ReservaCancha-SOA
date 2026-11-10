# Imagen para publicar servicio-pagos (extra) en Render
# Compila con Maven y deja solo el jar en la imagen final
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# El plan gratuito da 512 MB: la JVM no debe pasar del 70 %. Hora de Colombia para las reglas de horario
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -Duser.timezone=America/Bogota"
EXPOSE 8085
# Render entrega el puerto en PORT; en local se usa el de siempre (8085)
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8085} -jar app.jar"]
