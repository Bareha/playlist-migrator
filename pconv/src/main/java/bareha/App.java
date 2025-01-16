package bareha;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class App 
{
    public static void main( String[] args )
    {
        HttpClient client = HttpClient.newHttpClient(); // creating client
        String client_id = "800a13ce72b04d4eb5636c5b3af6beb6";
        String client_secret = "dc3e86d9fef0440aa4a2bb419fe316cb";
        String body = StringBuilder("grant_type=client_credentials&client_id=%s&client_secret=%s", client_id, client_secret);

        // this is to send a request
        HttpRequest request = HttpRequest.newBuilder()
            .uri(new URI("https://accounts.spotify.com/api/token"))
            .header("Content-Type: application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

    }
}
