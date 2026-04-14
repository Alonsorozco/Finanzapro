import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

public class Main {
    private static final int PORT = 3000;
    private static final String DATA_FILE = "data.json";

    public static void main(String[] args) throws IOException {
        // Initialize data file if it doesn't exist
        if (!Files.exists(Paths.get(DATA_FILE))) {
            Files.write(Paths.get(DATA_FILE), "[]".getBytes());
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        
        // API Route: GET/POST Transactions
        server.createContext("/api/transactions", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                    byte[] response = Files.readAllBytes(Paths.get(DATA_FILE));
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response);
                    os.close();
                } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    InputStream is = exchange.getRequestBody();
                    String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    Files.write(Paths.get(DATA_FILE), body.getBytes(StandardCharsets.UTF_8));
                    
                    String response = "{\"success\": true}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.length());
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1); // Method Not Allowed
                }
            }
        });

        // Static Files Route: Serve index.html
        server.createContext("/", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                String path = exchange.getRequestURI().getPath();
                if (path.equals("/")) path = "/index.html";
                
                // Remove leading slash for local file access
                File file = new File("." + path);
                if (file.exists() && !file.isDirectory()) {
                    byte[] response = Files.readAllBytes(file.toPath());
                    String contentType = getContentType(path);
                    exchange.getResponseHeaders().set("Content-Type", contentType);
                    exchange.sendResponseHeaders(200, response.length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response);
                    os.close();
                } else {
                    String response = "404 Not Found";
                    exchange.sendResponseHeaders(404, response.length());
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                }
            }
        });

        System.out.println("Servidor Java iniciado en http://localhost:" + PORT);
        server.setExecutor(null);
        server.start();
    }

    private static String getContentType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        return "text/plain";
    }
}
