var chaChing = (function () {
    "use strict";

/**
  *Scanner object that traverses the DOM for chaching templates and builds
  *config objects for each template
  */
 function Scanner(html){
    this.templateCache = {
        cache:{},
        add: function add(id){
            this.cache[id] = id,
        },
        get: function get(id){
            return this.cache.[id];
        },
        clear: function clear(){
            this.cache = {};
        }
    }
 };

    /**
     * Generate hash of template for caching purposes
     * @param string
     * @returns {number}
     */
    Scanner.prototype.generateHashFromTemplate = function generateHashFromTemplate(string) {
        var hash = 0;
        if (string.length == 0)
            return hash;
        for (let i = 0; i < string.length; i++) {
            var charCode = string.charCodeAt(i);
            hash = ((hash << 7) - hash) + charCode;
            hash = hash & hash;
        }
        return hash;
        }

    };

    /**
      * Scan the DOM for all cha-ching templates
      * @returns Array of template configs
      */
    Scanner.prototype.scan = function scan(){

            /**
             * Default Config
             */
             //TO-DO: Refactor into template object
            var defaultConfig = {
                debugMode : false,
                cache : "",
                rootPath : "",
                cssClass : "",
                dataSrc : null,
                data : {},
                html : "",
                parsedHTML: ""
            }

         var templates = document.querySelectorAll('script[type="chaching-template"]');

         var templateConfigs = [];

         templates.forEach(function(template,index){
             var config ={...defaultConfig};
             config.debugMode = template.getAttribute("debugMode");
             config.dataSrc = template.getAttribute("data-src");
             config.rootPath = template.getAttribute("rootPath");
             config.html = template.innerHTML
             config.cache = this.generateHashFromTemplate(template.innerHTML);

             template.setAttribute("id","chaching-"+config.cache);

             config.data = Getter.getData(config);
             templateConfigs.push(config);
         });


         console.log(templateConfigs);

         return templateConfigs;
     }
 }


/**
  *Getter object that retrieves the data from the specified data source
  */
 function Getter(config,url){
    this.config = config,
    this.url = url
 };

     /**
      * Retrieve the json from the data source
      * @param dataSrc
      * @returns {*}
      */
     Getter.prototype.getData = function getData(config){
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
     }

     /**
      * Retrieve the json data from an URL
      * @param url
      * @param withCredentials
      * @returns {{}}
      */
     Getter.prototype.getData = function getDataFromURL(config,withCredentials){
         console.log("getting data From URL");

         var ajaxRequest = new XMLHttpRequest();
         ajaxRequest.onreadystatechange = function() {
             if (this.readyState == 4 && this.status == 200) {
                 config.data = JSON.parse(this.responseText);
                 parseTemplate(config);
             }else if (this.readyState == 4 && (this.status < 200 || this.status > 200)){
                 //log the error in the console
                 console.log("Status: " + this.status + "-" + this.responseText);
             }
         };
         ajaxRequest.withCredentials = withCredentials;
         ajaxRequest.open("GET",config.dataSrc,true);
         ajaxRequest.send();
     }
/**
  *Parser object that parses the for chaching tokens
  */
 function Parser(templateConfig){
    this.templateConfig = templateConfig
 };

    /**
     * Parse custom content used in columns
     * @param templateData
     * @param customHTML
     * @param type
     * @returns {string}
     */
    Parser.prototype.parseTemplate = function parseTemplate(config){
        console.log("Parsing Custom HTML");
        var customHTML;
        //Regex to parse our variables (TO-DO: needs to be globalized)
        var variableRegex = /\${(.*?)}(?![^]*(\[\/\]))/g;
        //Regex to parse looping elements (TO-DO: needs to be globalized)
        var conditionalLoopRegex = /(\$\[(.*)\]([^]+?)\$\[\/\])/g;

        if(conditionalLoopRegex.test(config.html)){
            //TO-DO: Check for debug mode before writing out to console
            console.log("Contains conditional loop regex")
                customHTML = parseConditionalLoopElement(config.data,config.html);
        }

        if(variableRegex.test(config.html)){
            //TO-DO: Check for debug mode before writing out to console
            console.log("contains variable ")
            customHTML = parseVariableElement(config.data,config.html);
        }

        config.parsedHTML = customHTML;

        //find corresonding template
        var element = document.querySelector('#chaching-'+config.cache)

        //Update Temp
        element.outerHTML = config.parsedHTML;
    }

    /**
     * Parses Loop elements (e.g. $[object_path : foo == bar])
     * @param templateData
     * @param customHtml
     * @param isNested
     * @returns {*}
     */
    Parser.prototype.parseConditionalLoopElement = function parseConditionalLoopElement(templateData,customHtml,isNested){
        console.log("parsing conditional element")
        var nestedLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\!\=\=><]*\s*\w+]*)\]([^]+?)\[\/\])/g;
        var outerLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\!\=\=><]*\s*\w+]*)\]([^]+?)\$\[\/\])/g;
        var variableRegex = /\${(.*?)}(?![^]*(SAS\.DataTable|\[\/\]))/g;
        var conditionalLoopRegex = (!isNested) ? outerLoopRegex : nestedLoopRegex;
        var matches;
        var count = 0;

        while (matches = conditionalLoopRegex.exec(customHtml)) {

            var replacementString = "";

            var conditionalLoopElement = matches[1].trim();
            var conditionalLoopClause = matches[2].trim();
            var content = matches[3].trim();

            var objectPath = null;
            var condition = null;
            var hasCondition = true;

            //if the loop contains object path and condition
            if(conditionalLoopClause.split(":").length > 1){
                objectPath = conditionalLoopClause.split(":")[0].trim();
                condition = conditionalLoopClause.split(":")[1] ;
            }else{
                //if it only contains condition, then set the condition
                if(conditionalLoopClause.indexOf("!=") >= 0
                           || conditionalLoopClause.indexOf("==") >= 0
                           || conditionalLoopClause.indexOf("<") >= 0
                           || conditionalLoopClause.indexOf(">") >= 0
                           || conditionalLoopClause.indexOf(">=") >= 0
                           || conditionalLoopClause.indexOf("<=") >= 0){
                    objectPath = '';
                    condition = conditionalLoopClause;
                }else{
                    //if it doesn't contain condition, then it must be an object path
                    objectPath = conditionalLoopClause;
                    condition = '';
                }
            }

            if(!condition){
                console.log("No Condition provided in loop");
                hasCondition = false;
            }

            var startingObject = getStartingObject(templateData,objectPath);
            var matchingObjects = null;

            if (hasCondition) {
                matchingObjects = getMatchingObjects(startingObject,condition);
            } else {
                matchingObjects = getAllObjects(startingObject);
            }

            if(matchingObjects.length <= 0){
                customHtml = customHtml.replace(conditionalLoopElement,'');
            }else{

                variableRegex = /\${(.*?)}/g;

                var containsVariables = variableRegex.test(content);
                matchingObjects.forEach(function(obj){
                    var parsingContent = content;
                    nestedLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\!\=]*\s*\w+]*)\]([^]+?)\[\/\])/g;

                    //check for nested loop elements
                    if(nestedLoopRegex.test(parsingContent)){
                        parsingContent = parseConditionalLoopElement(obj,parsingContent,true);
                    }

                    if(containsVariables){
                        replacementString += parseVariableElement(obj,parsingContent);
                    }else{
                        replacementString += parsingContent;
                    }

                });

                customHtml = customHtml.replace(conditionalLoopElement,replacementString);
            }

            matches = 0;

        }

        return customHtml;

    }

    /**
         * Parses Variable elements (e.g. ${value|default_value|date_format})
         * @param templateData
         * @param customHtml
         * @param type
         * @returns {string|*}
         */
        Parser.prototype.parseVariableElements = function parseVariableElement(templateData,customHtml){
            console.log("parsing variable element");
            if(typeof(templateData)=="undefined" || !templateData){
                console.log("data undefined")
                return customHtml;
            }

            var replacementString = "";
            var sortString = "";
            var variableRegex = /\${(.*?)}(?![^]*(SAS\.DataTable|\[\/\]))/g;

            customHtml.match(variableRegex).forEach(function(variable,index){
                console.log("variable: " + variable);
                console.log("index" + index);
                console.log("template data: " + templateData)
                var propertyArray = variable.split(/\|/);
                var property = (variable.indexOf("|") >= 0) ? propertyArray[0].replace("{","").replace(/\$/g,"") : variable.replace("{","").replace(/\$/g,"").replace("}","");
                var defaultValue = (variable.indexOf("|") >= 0) ? propertyArray[1].replace("}","") : '';
                var dateTimeFormat = (propertyArray.length > 2) ? propertyArray[2].replace("}","") : '';
                var propertyValue = "null";
                if (property == "this" && typeof templateData === 'string' ) {
                    console.log("property value")
                    propertyValue = templateData;
                } else if(property.indexOf('.') >= 0) {
                    console.log("Property: " + property);
                    var obj = SAS.Utils.getObject(templateData, property);
                    if(typeof obj === "number") {
                        obj = JSON.stringify(obj);
                    }
                    propertyValue = obj;
                } else {
                    console.log("default")
                    propertyValue = templateData[property];
                    if (typeof propertyValue === 'undefined' && typeof templateData[0] === 'object' && templateData[0] !== null) {
                        propertyValue = templateData[0][property];
                    }

                    console.log("property value: " + propertyValue);
                }

                sortString = propertyValue;
                /* if datetime format provided, attempt to use it, else default to blank so defaultValue potentially used */
                if (dateTimeFormat.length > 0 && typeof propertyValue === "string") {
                    propertyValue = (date._isValid) ? date.format(dateTimeFormat) : "";
                    sortString = date.format('YYYYMMDD');
                    templateData[property + "_sort"] = sortString;
                }
                replacementString = (propertyValue) ? propertyValue : defaultValue;
                customHtml = customHtml.replace(variable,replacementString);
            });

            console.log("custom HTML: " + customHtml)
            return customHtml;

        }

        /**
         * This function parses the JSON response and
         * initializes the data object before it is passed into datatable object.
         * @param data
         * @param rootPath
         * @param condition
         * @returns {[]}
         */
        Parser.prototype.initializeData = function initializeData(data,rootPath,condition){
            if (!condition) {
                return initializeDataAll(data, rootPath);
            }

            var data = initializeDataAll(data, rootPath);
            var filteredObject = [];
            try {
                var notequals = true;
                var variable = condition.indexOf("!");
                if (variable < 0) {
                    notequals = false;
                    variable = condition.indexOf("=");
                }
                var value = condition.substring(variable);
                variable = condition.substring(0,variable);
                variable = variable.trim();
                value = value.replace(/[^a-zA-Z\d_.]+/,""); //remove all non-alphanumeric-and-._ characters
                data.forEach(function(element)
                    {
                        if (value) {

                            if (xor(notequals, SAS.Utils.getObject(element,variable) === value )) {
                                filteredObject.push(element);
                            }
                        } else {
                            var rowtest = SAS.Utils.getObject(element, variable);
                            if (rowtest) {
                                filteredObject.push(element);
                            }
                        }
                    }
                );

            } catch (err){
                console.log("error filtering data for condition " + condition);
                return data;
            }

            return filteredObject;

        }


        /**
         * This function parses the JSON response and
         * initializes the data object before it is passed into datatable object.
         * @param data
         * @param rootPath
         * @returns {[]|*}
         */
        Parser.prototype.initializeDataAll = function initializeDataAll(data,rootPath){

            var filteredObject = [];

            //return the original object if no root path is specified
            if(!rootPath){return data;}

            if(!Array.isArray(data)){
                return SAS.Utils.getObject(data,rootPath);
            }else{

                if(data.length <= 1){
                    return data[0][rootPath];
                }else{
                    data.forEach(function(element){
                        var selectedElement = element[rootPath];
                        if(!selectedElement || !Array.isArray(selectedElement)){
                            filteredObject.push(element[rootPath]);
                        }else{
                            element[rootPath].forEach(function(nestedElement){
                                filteredObject.push(nestedElement);
                            });
                        }
                    });

                    return filteredObject;
                }
            }
        }

        /**
          * Return the starting object for Conditinoal Loop Elements
          * @param data
          * @param rootPath
          * @returns {undefined|[]|*}
          */
         Parser.prototype.getStartingObject = function getStartingObject(data,rootPath){
             if(!data){
                 return;
             }

             var filteredObject = [];

             //return the original object if no root path is specified
             if(!rootPath){return data;}

             //don't traverse if the object if the root path doesn't specify nested objects
             if(rootPath.indexOf(".") < 0){
                 if(Array.isArray(data)){
                     data.forEach(function(element){
                         filteredObject.push(element[rootPath]);
                     });

                 }else{

                     if(typeof data[rootPath] == "undefined" || !data[rootPath]){
                         console.log("starting object is undefined");
                         return;
                     }else{
                         filteredObject.push(data[rootPath]);
                     }
                 }

                 return filteredObject;
             }

             var objectArray = rootPath.split(".");
             var previousObject = objectArray.shift();
             var remainingObjects = objectArray.join(".");

             return getStartingObject(data[previousObject],remainingObjects);
         }


/***** END OF PARSER OBJECT *****/

/**
  *Evaluator object that evaulates logical expressions
  */
 function Evaluator(data,expression){
    this.data = data,
    this.expression = expression
 };

    /**
      * Returns objects that meet the expression.
      * @param data
      * @param expression
      * @returns {[]|*[]}
      */
     Evaluator.prototype.getMatchingObjects = function getMatchingObjects(data,expression){
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
     }

     /**
      * Returns all objects
      * @param data
      * @returns {[]|*[]}
      */
     Evaluator.prototype.getAllObjects = function getAllObjects(data){
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
     }

     Evaluator.prototype.xor = function xor(a, b) {
         return (a && !b) || (b && !a);
     }

     /**
      * Evaluates the logical operators for conditional loop elements
      * @param data
      * @param expression
      * @returns {[]}
      */
     Evaluator.prototype.dataMatchingCondition = function dataMatchingCondition(data,expression){
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
     }


/***** END OF Evaluator OBJECT *****/

/**
  *Writer object that converts chaching tokens to text and formats text
  */
 function Writer(data,template){}

 /***** END OF Writer OBJECT *****/


/**
  *Error Report object that provides logging messages when debug  mode is enabled.
  */
 function Error(debugEnabled,errorCode,errorMessage){
    this.debugEnabled = (debugEnabled!=="undefined") ? debugEnabled : false,
    this.errorCode = errorCode,
    this.errorMessage = errorMessage
 }

    /**
      * Log error message to the console
      */
     Error.prototype.log = function(){
        if(this.debugEnabled){
            console.log(this.errorCode+" - "+this.errorMessage);
        }
    }

 /***** END OF Error OBJECT *****/

    var chaChing = {
        Scanner : undefined,
        Getter : undefined,
        Parser : undefined,
        Evaluator : undefined,
        Writer : undefined
    };

    return {
        chaChing:chaChing,
        renderTemplates:renderTemplates
    };
})();
chaChing.renderTemplates();