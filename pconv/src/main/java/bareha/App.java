package bareha;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Scanner;

import com.google.api.client.json.JsonFactory;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.gson.Gson;

import io.github.cdimascio.dotenv.Dotenv;


public class App 
{
    private static final Scanner sc = new Scanner(System.in);
    public static void main( String[] args ) throws URISyntaxException, IOException, InterruptedException, ExpiredTokenException
     {
        
        HttpClient client = HttpClient.newHttpClient(); // creating client
        String client_id = System.getenv("SPOTIFY_CLIENT_ID");
        String client_secret = System.getenv("SPOTIFY_CLIENT_SECRET");
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

        String json_accessToken = responseToken.body();
        Gson gson1 = new Gson();
        AccessToken accessToken = gson1.fromJson(json_accessToken, AccessToken.class);

        if(responseToken.statusCode() != 200){
            throw new ExpiredTokenException("invalid token");
        }

        // now we get the playlist info
        System.out.print("Enter the PLaylist ID: "); // make sure playlist id, not album id
        String playlistID = sc.nextLine();

        HttpRequest requestPlaylist = HttpRequest.newBuilder()
            .uri(new URI("https://api.spotify.com/v1/playlists/" + playlistID))
            .header("Authorization", "Bearer " + accessToken.getAccess_Token())
            .GET()
            .build();
        
        HttpResponse<String> responsePlaylist = client.send(requestPlaylist, HttpResponse.BodyHandlers.ofString());
        String playlist_details = responsePlaylist.body();
        Gson gson2 = new Gson();
        SearchQuery searchQuery = gson2.fromJson(playlist_details, SearchQuery.class);
        if(searchQuery.getPublic() != true){
            System.out.println("Please enter a public playlist :(");
            return;
        }
        System.out.println("Playlist name: " + searchQuery.getPlaylist_Name());

        ArrayList<String> queryList = new ArrayList<>();
        if (searchQuery.getTracks() != null && searchQuery.getTracks().getItems() != null) {
            for (TrackItem item : searchQuery.getTracks().getItems()) {
                String query = "";
                if (item.getTrack() != null) {
                    query = item.getTrack().getName() + " ";
                }
                if (item.getTrack().getAlbum() != null && !item.getTrack().getAlbum().getName().equals(item.getTrack().getName())) {
                    query = query + item.getTrack().getAlbum().getName() + " ";
                }
                if (item.getTrack().getArtists() != null) {
                    for (Artist artist : item.getTrack().getArtists()) {
                        query = query + artist.getName();
                    }
                }
                query = query + " official audio";
                queryList.add(query);
            }
        }
        for (String searchquery : queryList){
            System.out.println(searchquery);
        }

        YouTube service = getYouTubeService();
        System.out.println(service);
    }
    private static YouTube getYouTubeService() throws IOException {
        JsonFactory jsonFactory = JacksonFactory.getDefaultInstance();
        NetHttpTransport httpTransport = new NetHttpTransport();
        Dotenv dotenv = Dotenv.configure()
            .directory("C:/Bareha_Projects/PlaylistConverter")
            .load();
        String CLIENT_SECRET_PATH = dotenv.get("CLIENT_SECRET_JSON");
    
        if (CLIENT_SECRET_PATH == null) {
            throw new IOException("Resource not found: " + CLIENT_SECRET_PATH);
        }
    
        Reader reader = new StringReader(CLIENT_SECRET_PATH);
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(jsonFactory, reader);
    
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, jsonFactory, clientSecrets,
                Collections.singletonList("https://www.googleapis.com/auth/youtube.force-ssl"))
                .setAccessType("offline")
                .build();
    
        Credential credential = flow.loadCredential("user"); // checks if the credential is saved already
    
        if (credential == null) {
            String redirectUri = "urn:ietf:wg:oauth:2.0:oob";
            String authUrl = flow.newAuthorizationUrl().setRedirectUri(redirectUri).build();
            System.out.println("Open this URL in your browser and authorize the application:");
            System.out.println(authUrl);
    
            System.out.print("Enter the authorization code: ");
            String code = sc.nextLine();
    
            GoogleTokenResponse tokenResponse = flow.newTokenRequest(code) // get tokens from auth code
                    .setRedirectUri(redirectUri)
                    .execute();

            Credential newCredential = flow.createAndStoreCredential(tokenResponse, "user");
    
            System.out.println("Authentication successful!");
    
            return new YouTube.Builder(httpTransport, jsonFactory, newCredential)
                    .setApplicationName("Playlist Maker")
                    .build();
        }
        
        return new YouTube.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("Playlist Maker")
                .build();
    }    
}