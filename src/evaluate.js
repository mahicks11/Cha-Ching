var chaChing = chaChing || {};

/**
  *Evaluator object that handles logical expressions
  */
 chaChing.Evaluator = (function(){

     var config = (function(data,expression){
        this.data = data,
        this.expression = expression
     });

    /**
      * Returns objects that meet the expression.
      * @param data
      * @param expression
      * @returns {[]|*[]}
      */
     var getMatchingObjects = (function (data,expression){
         if(!data){
             return [];
         }

         if(expression.indexOf("!=") >= 0
         || expression.indexOf("==") >= 0
         || expression.indexOf("<") >= 0
         || expression.indexOf(">") >= 0
         || expression.indexOf(">=") >= 0
         || expression.indexOf("<=") >= 0){
             return dataMatchingCondition(data, expression);
         }
     });

     /**
     * XOR Operator
     */
     function xor(a, b) {
         return (a && !b) || (b && !a);
     }

     /**
      * Evaluates the logical operators for conditional loop elements
      * @param data
      * @param expression
      * @returns {[]}
      */
     var dataMatchingCondition = (function(data,expression){
         console.log("Matching Conditions");
         console.log("data");
         console.log(data);
         console.log("condiiton: "+ expression);

         var matchingElements = [];
         var notequals = expression.indexOf("!=") >= 0;  //can only have one not-equals, not usable in compounds

         var EQUALS_REGEX = /[a-zA-Z0-9\s\w_]+==[a-zA-Z0-9\s\w_]+/g;
         var COMPARE_REGEX = /[a-zA-Z0-9\s\w_]+[><]+[=]?[a-zA-Z0-9\s\w_]+/g;

         var localexpression = expression.replace("!==","==").replace("!=", "==");

         console.log("local expression: " + localexpression);

         if(Array.isArray(data)){
             data.forEach(function(nestedObject,index){
                 if(Array.isArray(nestedObject)){
                     nestedObject.forEach(function(object,index){
                         if(localexpression.match(EQUALS_REGEX)){
                             localexpression.match(EQUALS_REGEX).forEach(function(predicate,index){
                                 var key = predicate.split("==")[0].trim();
                                 var value = predicate.split("==")[1].trim();
                                 if(typeof object[key] !== 'undefined' && xor(object[key].toString()==value,notequals)){
                                     matchingElements.push(object);
                                 }
                             });
                         }else if(localexpression.match(COMPARE_REGEX)){
                             localexpression.match(COMPARE_REGEX).forEach(function(predicate,index){

                                 var COMPARE_EXPRESSION = /[<>=]+/g;
                                 let operator = predicate.match(COMPARE_EXPRESSION);

                                 var key = predicate.split(operator)[0].trim();
                                 var value = predicate.split(operator)[1].trim();

                                 if(operator==">"){
                                     if(typeof object[key] !== 'undefined'
                                     && object[key] > parseFloat(value)){
                                         console.log(object);
                                         matchingElements.push(object);
                                     }
                                 }else if(operator=="<"){
                                       if(typeof object[key] !== 'undefined'
                                       && object[key] < parseFloat(value)){
                                           console.log(object);
                                           matchingElements.push(object);
                                       }
                                 }else if(operator==">="){
                                    if(typeof object[key] !== 'undefined'
                                    && object[key] >= parseFloat(value)){
                                        console.log(object);
                                        matchingElements.push(object);
                                    }
                                 }else if(operator=="<="){
                                     console.log("greather than")
                                     if(typeof object[key] !== 'undefined'
                                     && object[key] <= parseFloat(value)){
                                         console.log(object);
                                         matchingElements.push(object);
                                     }
                                 }


                             });
                         }


                     });
                 }else{
                     if(localexpression.match(EQUALS_REGEX)){
                         localexpression.match(EQUALS_REGEX).forEach(function(predicate,index){
                             var key = predicate.split("==")[0].trim();
                             var value = predicate.split("==")[1].trim();
                             if(typeof nestedObject[key] !== 'undefined' && xor(nestedObject[key].toString()==value,notequals)){
                                 matchingElements.push(nestedObject);
                             }
                         });
                     }else if(localexpression.match(COMPARE_REGEX)){
                         localexpression.match(COMPARE_REGEX).forEach(function(predicate,index){

                             var COMPARE_EXPRESSION = /[<>=]+/g;
                             let operator = predicate.match(COMPARE_EXPRESSION);

                             var key = predicate.split(operator)[0].trim();
                             var value = predicate.split(operator)[1].trim();

                             if(operator==">"){
                                 if(typeof nestedObject[key] !== 'undefined'
                                 && nestedObject[key] > parseFloat(value)){
                                     console.log(nestedObject);
                                     matchingElements.push(nestedObject);
                                 }
                             }else if(operator=="<"){
                                   if(typeof nestedObject[key] !== 'undefined'
                                   && nestedObject[key] < parseFloat(value)){
                                       console.log(nestedObject);
                                       matchingElements.push(nestedObject);
                                   }
                             }else if(operator==">="){
                                if(typeof nestedObject[key] !== 'undefined'
                                && nestedObject[key] >= parseFloat(value)){
                                    console.log(nestedObject);
                                    matchingElements.push(nestedObject);
                                }
                             }else if(operator=="<="){
                                 console.log("greather than")
                                 if(typeof nestedObject[key] !== 'undefined'
                                 && nestedObject[key] <= parseFloat(value)){
                                     console.log(nestedObject);
                                     matchingElements.push(nestedObject);
                                 }
                             }


                         });
                     }
                 }
             });
         }else{
             if(expression.match(EQUALS_REGEX)){
                 expression.match(EQUALS_REGEX).forEach(function(predicate,index){
                     var key = predicate.split("==")[0].trim();
                     var value = predicate.split("==")[1].trim();

                     if(data[key].toString()===value){
                         matchingElements.push(data);
                     }
                 });
             }else if(expression.match(COMPARE_REGEX)){
                 expression.match(COMPARE_REGEX).forEach(function(predicate,index){
                     var COMPARE_EXPRESSION = /[<>=]+/g;
                     let operator = predicate.match(COMPARE_EXPRESSION);

                     var key = predicate.split(operator)[0].trim();
                     var value = predicate.split(operator)[1].trim();

                     if(operator==">"){
                         if(typeof data[key] !== 'undefined'
                         && data[key] > parseFloat(value)){
                             console.log(data);
                             matchingElements.push(data);
                         }
                     }else if(operator=="<"){
                           if(typeof data[key] !== 'undefined'
                           && data[key] < parseFloat(value)){
                               console.log(data);
                               matchingElements.push(data);
                           }
                     }else if(operator==">="){
                        if(typeof data[key] !== 'undefined'
                        && data[key] >= parseFloat(value)){
                            console.log(data);
                            matchingElements.push(data);
                        }
                     }else if(operator=="<="){
                         console.log("greather than")
                         if(typeof data[key] !== 'undefined'
                         && data[key] <= parseFloat(value)){
                             console.log(data);
                             matchingElements.push(data);
                         }
                     }

                 });
             }
         }

         return matchingElements;
     });

     return{
         getMatchingObjects:getMatchingObjects,
         dataMatchingCondition:dataMatchingCondition
     }

});