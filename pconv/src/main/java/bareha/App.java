package bareha;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Scanner;

import com.google.gson.Gson;

public class App 
{
    public static void main( String[] args ) throws URISyntaxException, IOException, InterruptedException, ExpiredTokenException
     {

        HttpClient client = HttpClient.newHttpClient(); // creating client
        String client_id = "800a13ce72b04d4eb5636c5b3af6beb6";
        String client_secret = "dc3e86d9fef0440aa4a2bb419fe316cb";
        String body = String.format("grant_type=client_credentials&client_id=%s&client_secret=%s", client_id, client_secret);

        // this is to send a request
        HttpRequest requestToken = HttpRequest.newBuilder()
            .uri(new URI("https://accounts.spotify.com/api/token"))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> responseToken = client.send(requestToken, HttpResponse.BodyHandlers.ofString()); // this will get response

        // System.out.println("response code: " + response.statusCode());
        // System.out.println("response body: " + response.body());

        String jsonString = responseToken.body();
        Gson gson = new Gson();
        AccessToken accessToken = gson.fromJson(jsonString, AccessToken.class);
        System.out.println("Acess Token: " + accessToken.getAccess_Token());
        System.out.println("Token Type: " + accessToken.getToken_Type());
        System.out.println("Expires In: " + accessToken.getExpires_In());

        if(responseToken.statusCode() != 200){
            throw new ExpiredTokenException("invalid token");
        }

        // now we get the playlist info
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter the PLaylist ID: "); // make sure playlist id, not album id
        String playlistID = sc.nextLine();
        sc.close();

        HttpRequest requestPlaylist = HttpRequest.newBuilder()
            .uri(new URI("https://api.spotify.com/v1/playlists/" + playlistID))
            .header("Authorization", "Bearer " + accessToken.getAccess_Token())
            .GET()
            .build();
        
        HttpResponse<String> responsePlaylist = client.send(requestPlaylist, HttpResponse.BodyHandlers.ofString());
        System.out.println(responsePlaylist.body());
    }
}
