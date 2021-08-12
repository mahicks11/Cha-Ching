/**
  *Error Report object that generates logging messages when debug  mode is enabled.
  */
chaChing.Error = (function(){

    var config = (function(debugEnabled,errorCode,errorMessage){
        this.debugEnabled = (debugEnabled!=="undefined") ? debugEnabled : false,
        this.errorCode = errorCode,
        this.errorMessage = errorMessage;
    });

    /**
      * Log error message to the console
     **/
     var log = (function(){
        if(this.debugEnabled){
            console.log(this.errorCode+" - "+this.errorMessage);
        }
    });

    return{
        log:log,
        config:config
    }
 });