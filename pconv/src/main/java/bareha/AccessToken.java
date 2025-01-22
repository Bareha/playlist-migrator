package bareha;

public class AccessToken {
    private String access_token;
    private String token_type;
    private int expires_in;

    void setAccess_Token(String access_token){
        this.access_token = access_token;
    }

    void setToken_Type(String token_type){
        this.token_type = token_type;
    }

    void setExpires_In(int expires_in){
        this.expires_in = expires_in;
    }

    String getAccess_Token(){
        return access_token;
    }

    String getToken_Type(){
        return token_type;
    }

    int getExpires_In(){
        return expires_in;
    }
}