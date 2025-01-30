package bareha;

import java.util.ArrayList;

public class SearchQuery {
    private String name;
    private Owner owner;
    private Tracks tracks;

    public String getPLaylist_Name(){
        return name;
    }
    public Owner getOwner(){
        return owner;
    }
    public Tracks getTracks(){
        return tracks;
    }
}

class Owner{
    private String display_name;

    public String getDisplay_Name(){
        return display_name;
    }
}

class Tracks{
    private ArrayList<TrackItem> items;

    public ArrayList<TrackItem> getItems(){
        return items;
    }
}

class TrackItem{
    private Track track;

    public Track getTrack(){
        return track;
    }
}

class Track{
    private String name;
    private ArrayList<Artist> artists;
    private Album album;

    public String getName(){
        return name;
    }
    public ArrayList<Artist> getArtists(){
        return artists;
    }
    public Album getAlbum(){
        return album;
    }
}

class Artist{
    private String name;

    public String getName(){
        return name;
    }
}

class Album{
    private String name;

    public String getName(){
        return name;
    }
}