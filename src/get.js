
/**
  *Getter object that retrieves the data from the specified data source
  */
 chaChing.Getter = (function(){

     var config  = (function(config,url){
        this.config = config,
        this.url = url
     });

     /**
      * Retrieve the json from the data source
      * @param dataSrc
      * @returns {*}
      */
     var getData = (function(config){
         console.log("getting data")
         if(config.dataSrc.indexOf("http") !== -1){
             //External URL
             console.log("EXTERNAL URL");
             return getDataFromURL(config,true);
         } else if(config.dataSrc.indexOf("http") === -1 && config.dataSrc.indexOf("/") !== -1) {
             //Internal URL
             console.log("INTERNAL URL");
             //TO-DO Retrieve data from internal source
             return getDataFromURL(config,false);
         }else{
             //dataSrc is already a valid JSON structure
             return config.dataSrc;
         }
     });

     /**
      * Retrieve the json data from an URL
      * @param url
      * @param withCredentials
      * @returns {{}}
      */
     var getDataFromURL = (function(config,withCredentials){
         console.log("getting data From URL");

         var ajaxRequest = new XMLHttpRequest();
         ajaxRequest.onreadystatechange = function() {
             if (this.readyState == 4 && this.status == 200) {
                 config.data = JSON.parse(this.responseText);
                 chaChing.Parser.parseTemplate(config);
             }else if (this.readyState == 4 && (this.status < 200 || this.status > 200)){
                 //log the error in the console
                 console.log("Status: " + this.status + "-" + this.responseText);
             }
         };
         ajaxRequest.withCredentials = withCredentials;
         ajaxRequest.open("GET",config.dataSrc,true);
         ajaxRequest.send();
     });

     return{
        getData:getData,
        getDataFromURL:getDataFromURL
     }

});