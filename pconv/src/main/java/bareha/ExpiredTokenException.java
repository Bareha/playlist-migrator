package bareha;

public class ExpiredTokenException extends Exception{
    public ExpiredTokenException(){
        super();
    }
    public ExpiredTokenException(String message){
        super(message);
    }
    public ExpiredTokenException(String message, Throwable cause){
        super(message, cause);
    }
}
