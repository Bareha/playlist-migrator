package bareha;
import java.io.File;
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
import java.util.List;
import java.util.Scanner;

import com.google.api.client.json.JsonFactory;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Playlist;
import com.google.api.services.youtube.model.PlaylistItem;
import com.google.api.services.youtube.model.PlaylistItemSnippet;
import com.google.api.services.youtube.model.PlaylistSnippet;
import com.google.api.services.youtube.model.PlaylistStatus;
import com.google.api.services.youtube.model.ResourceId;
import com.google.api.services.youtube.model.SearchListResponse;
import com.google.api.services.youtube.model.SearchResult;
import com.google.gson.Gson;

import io.github.cdimascio.dotenv.Dotenv;


public class App 
{
    private static final Scanner sc = new Scanner(System.in);
    public static void main( String[] args ) throws URISyntaxException, IOException, InterruptedException, ExpiredTokenException, SpotifyApiException
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
        ensureSuccess(responsePlaylist.statusCode(), responsePlaylist.body(), "Failed to fetch playlist " + playlistID);
        String playlist_details = responsePlaylist.body();
        Gson gson2 = new Gson();
        SearchQuery searchQuery = gson2.fromJson(playlist_details, SearchQuery.class);
        if(searchQuery.getPublic() != true){
            System.out.println("Please enter a public playlist :(");
            return;
        }
        String playlistName = searchQuery.getPlaylist_Name();
        System.out.println("Playlist name: " + playlistName);

        List<TrackItem> allTrackItems = collectAllTrackItems(searchQuery.getTracks(),
            url -> fetchTracksPage(client, url, accessToken.getAccess_Token()));

        ArrayList<String> queryList = new ArrayList<>();
        for (TrackItem item : allTrackItems) {
            String query = buildSearchQuery(item);
            if (query == null) {
                System.out.println("Skipping a track with missing metadata (likely removed from Spotify).");
                continue;
            }
            queryList.add(query);
        }

        System.out.println("Matched " + queryList.size() + " of " + allTrackItems.size() + " tracks to a search query.");
        int estimatedUnits = estimateYoutubeQuotaUnits(queryList.size());
        System.out.println("Estimated YouTube API quota usage: " + estimatedUnits + " units (default daily cap is 10,000).");
        if (estimatedUnits > 10000) {
            System.out.println("Warning: this migration may exceed your daily YouTube API quota and fail partway through.");
        }

        YouTube service = getYouTubeService();
        System.out.println(service);

        YouTube.Playlists.Insert request = service.playlists()
            .insert("snippet,status", new Playlist()
                .setSnippet(new PlaylistSnippet().setTitle(playlistName))
                .setStatus(new PlaylistStatus().setPrivacyStatus("private")));
        Playlist playlistResponse = request.execute();
        String playlistId = playlistResponse.getId(); 

        List<String> videoIds = new ArrayList<>();
        for (String searchQ : queryList) {
            YouTube.Search.List searchRequest = service.search()
                .list("id")
                .setQ(searchQ)
                .setMaxResults(1L)
                .setType("video");

            SearchListResponse searchResponse = searchRequest.execute();
            List<SearchResult> searchResults = searchResponse.getItems();

            if (searchResults != null && !searchResults.isEmpty()) {
                String videoId = searchResults.get(0).getId().getVideoId();
                videoIds.add(videoId);
            } else {
                System.out.println("No YouTube match found for: " + searchQ);
            }
        }

        for (String videoId : videoIds) {
            YouTube.PlaylistItems.Insert insertRequest = service.playlistItems()
                .insert("snippet", new PlaylistItem()
                    .setSnippet(new PlaylistItemSnippet()
                        .setPlaylistId(playlistId)
                        .setResourceId(new ResourceId()
                            .setKind("youtube#video")
                            .setVideoId(videoId))));

            insertRequest.execute(); 
        }
    }

    static String buildSearchQuery(TrackItem item) {
        Track track = item.getTrack();
        if (track == null) {
            return null;
        }
        StringBuilder query = new StringBuilder(track.getName());
        Album album = track.getAlbum();
        if (album != null && album.getName() != null && !album.getName().equals(track.getName())) {
            query.append(' ').append(album.getName());
        }
        if (track.getArtists() != null) {
            for (Artist artist : track.getArtists()) {
                query.append(' ').append(artist.getName());
            }
        }
        query.append(" official");
        return query.toString();
    }

    static void ensureSuccess(int statusCode, String body, String context) throws SpotifyApiException {
        if (statusCode / 100 != 2) {
            throw new SpotifyApiException(context + " (HTTP " + statusCode + "): " + body);
        }
    }

    @FunctionalInterface
    interface PageFetcher {
        Tracks fetch(String url) throws IOException, InterruptedException, URISyntaxException, SpotifyApiException;
    }

    static List<TrackItem> collectAllTrackItems(Tracks firstPage, PageFetcher fetchNextPage)
            throws IOException, InterruptedException, URISyntaxException, SpotifyApiException {
        List<TrackItem> all = new ArrayList<>();
        Tracks page = firstPage;
        while (page != null) {
            if (page.getItems() != null) {
                all.addAll(page.getItems());
            }
            String next = page.getNext();
            page = (next != null) ? fetchNextPage.fetch(next) : null;
        }
        return all;
    }

    private static Tracks fetchTracksPage(HttpClient client, String url, String bearerToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(url))
                .header("Authorization", "Bearer " + bearerToken)
                .GET()
                .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            ensureSuccess(response.statusCode(), response.body(), "Failed to fetch next page of tracks");
            return new Gson().fromJson(response.body(), Tracks.class);
        } catch (IOException | InterruptedException | URISyntaxException | SpotifyApiException e) {
            throw new RuntimeException("Failed to fetch next page of tracks from " + url, e);
        }
    }

    static int estimateYoutubeQuotaUnits(int trackCount) {
        return 50 + trackCount * 150; // playlists.insert (50) + per-track search (100) + playlistItems.insert (50)
    }

    static String resolveConfigDir(String envOverride, String userHome) {
        if (envOverride != null && !envOverride.isBlank()) {
            return envOverride;
        }
        return userHome + File.separator + ".pconv";
    }

    private static YouTube getYouTubeService() throws IOException {
        JsonFactory jsonFactory = JacksonFactory.getDefaultInstance();
        NetHttpTransport httpTransport = new NetHttpTransport();

        String configDir = resolveConfigDir(System.getenv("PCONV_CONFIG_DIR"), System.getProperty("user.home"));
        File configDirFile = new File(configDir);
        if (!configDirFile.exists()) {
            configDirFile.mkdirs();
        }

        Dotenv dotenv = Dotenv.configure()
            .directory(configDir)
            .ignoreIfMissing()
            .load();
        String clientSecretJson = dotenv.get("CLIENT_SECRET_JSON");

        if (clientSecretJson == null) {
            throw new IOException("CLIENT_SECRET_JSON not set. Add it to a .env file in " + configDir
                + " (override with the PCONV_CONFIG_DIR environment variable).");
        }

        Reader reader = new StringReader(clientSecretJson);
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(jsonFactory, reader);

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, jsonFactory, clientSecrets,
                Collections.singletonList("https://www.googleapis.com/auth/youtube.force-ssl"))
                .setAccessType("offline")
                .setDataStoreFactory(new FileDataStoreFactory(new File(configDirFile, "tokens")))
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