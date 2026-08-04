package bareha;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.File;
import java.util.List;

import org.junit.Test;

import com.google.gson.Gson;

/**
 * Unit test for simple App.
 */
public class AppTest
{
    private static final Gson gson = new Gson();

    /**
     * Rigorous Test :-)
     */
    @Test
    public void shouldAnswerWithTrue()
    {
        assertTrue( true );
    }

    @Test
    public void buildSearchQuery_includesAlbumWhenDifferentFromTrackName() {
        TrackItem item = gson.fromJson(
            "{\"track\":{\"name\":\"Song\",\"album\":{\"name\":\"Album\"},\"artists\":[{\"name\":\"Artist\"}]}}",
            TrackItem.class);
        assertEquals("Song Album Artist official", App.buildSearchQuery(item));
    }

    @Test
    public void buildSearchQuery_omitsAlbumWhenSameAsTrackName() {
        TrackItem item = gson.fromJson(
            "{\"track\":{\"name\":\"Song\",\"album\":{\"name\":\"Song\"},\"artists\":[{\"name\":\"Artist\"}]}}",
            TrackItem.class);
        assertEquals("Song Artist official", App.buildSearchQuery(item));
    }

    @Test
    public void buildSearchQuery_separatesMultipleArtistsWithSpaces() {
        TrackItem item = gson.fromJson(
            "{\"track\":{\"name\":\"Song\",\"artists\":[{\"name\":\"Drake\"},{\"name\":\"21 Savage\"}]}}",
            TrackItem.class);
        assertEquals("Song Drake 21 Savage official", App.buildSearchQuery(item));
    }

    @Test
    public void buildSearchQuery_returnsNullWhenTrackIsRemoved() {
        TrackItem item = gson.fromJson("{\"track\":null}", TrackItem.class);
        assertNull(App.buildSearchQuery(item));
    }

    @Test
    public void buildSearchQuery_handlesMissingAlbumName() {
        TrackItem item = gson.fromJson(
            "{\"track\":{\"name\":\"Song\",\"album\":{},\"artists\":[{\"name\":\"Artist\"}]}}",
            TrackItem.class);
        assertEquals("Song Artist official", App.buildSearchQuery(item));
    }

    @Test
    public void ensureSuccess_doesNotThrowOn2xx() throws Exception {
        App.ensureSuccess(200, "{}", "ctx");
    }

    @Test
    public void ensureSuccess_throwsOn4xxWithContextAndBody() {
        try {
            App.ensureSuccess(404, "{\"error\":{\"status\":404,\"message\":\"not found\"}}", "Failed to fetch playlist abc123");
            fail("expected SpotifyApiException");
        } catch (SpotifyApiException e) {
            assertTrue(e.getMessage().contains("Failed to fetch playlist abc123"));
            assertTrue(e.getMessage().contains("404"));
            assertTrue(e.getMessage().contains("not found"));
        }
    }

    @Test
    public void collectAllTrackItems_followsPaginationAndMergesItemsInOrder() throws Exception {
        Tracks firstPage = gson.fromJson(
            "{\"items\":[{\"track\":{\"name\":\"A\"}},{\"track\":{\"name\":\"B\"}}],\"next\":\"http://example.com/page2\"}",
            Tracks.class);
        Tracks secondPage = gson.fromJson(
            "{\"items\":[{\"track\":{\"name\":\"C\"}}],\"next\":null}",
            Tracks.class);

        List<TrackItem> result = App.collectAllTrackItems(firstPage, url -> {
            assertEquals("http://example.com/page2", url);
            return secondPage;
        });

        assertEquals(3, result.size());
        assertEquals("A", result.get(0).getTrack().getName());
        assertEquals("B", result.get(1).getTrack().getName());
        assertEquals("C", result.get(2).getTrack().getName());
    }

    @Test
    public void collectAllTrackItems_stopsWhenNextIsNull() throws Exception {
        Tracks onlyPage = gson.fromJson(
            "{\"items\":[{\"track\":{\"name\":\"A\"}}],\"next\":null}",
            Tracks.class);

        List<TrackItem> result = App.collectAllTrackItems(onlyPage, url -> {
            throw new AssertionError("should not fetch a next page when next is null");
        });

        assertEquals(1, result.size());
    }

    @Test
    public void estimateYoutubeQuotaUnits_accountsForPlaylistCreationSearchAndInsert() {
        assertEquals(50, App.estimateYoutubeQuotaUnits(0));
        assertEquals(200, App.estimateYoutubeQuotaUnits(1));
        assertEquals(15050, App.estimateYoutubeQuotaUnits(100));
    }

    @Test
    public void resolveConfigDir_usesEnvOverrideWhenPresent() {
        assertEquals("C:/custom/dir", App.resolveConfigDir("C:/custom/dir", "C:/Users/someone"));
    }

    @Test
    public void resolveConfigDir_fallsBackToUserHomeWhenOverrideIsNullOrBlank() {
        String expected = "C:/Users/someone" + File.separator + ".pconv";
        assertEquals(expected, App.resolveConfigDir(null, "C:/Users/someone"));
        assertEquals(expected, App.resolveConfigDir("   ", "C:/Users/someone"));
    }
}
