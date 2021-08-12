/**
* Utility object with shared functions
*/
chaChing.Util = (function() {

    /**
      * Returns all objectsdddd
      * @param data
      * @returns {[]|*[]}
      */
     var getAllObjects = (function (data){
         if(!data){
             return [];
         }

         var allElements = [];

         if(Array.isArray(data)){
             data.forEach(function(nestedObject,index){
                 if (Array.isArray(nestedObject))
                     nestedObject.forEach(function(object,index){
                         allElements.push(object);

                     });
             });
         }else{
             allElements.push(data);
         }
         return allElements;
     })

     return{
        getAllObjects
     }

});


