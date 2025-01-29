package bareha;

import java.util.ArrayList;

public class SearchQuery {
    private String name;
    private String track_name;
    private ArrayList<String> artists;
    private String album_name;
    private String owner;

    void setOwner(String owner){
        this.owner = owner;
    }
    String getOwner(){
        return owner;
    }
    void setPlaylist_Name(String playlist_name){
        this.name = name;
    }
    void setTrack_Name(String track_name){
        this.track_name = track_name;
    }
    void setArtists(ArrayList<String> artists){
        this.artists = artists;
    }
    void setAlbum_Name(String album_name){
        this.album_name = album_name;
    }
    String getPlaylist_Name(){
        return name;
    }
    String getTrack_Name(){
        return track_name;
    }
    ArrayList<String> getArtists(){
        return artists;
    }
    String getAlbum_Name(){
        return album_name;
    }
    String generateQuery(){
        return "a";
    }
}
