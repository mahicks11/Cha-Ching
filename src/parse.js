
/**
  *Parser object that parses chaching templates
  */
chaChing.Parser = (function(){

    //Default template config
     var config = (function(templateConfig){
        this.templateConfig = templateConfig
     });

    /**
     * Parse custom content used in columns
     * @param templateData
     * @param customHTML
     * @param type
     * @returns {string}
     */
    var parseTemplate = (function parseTemplate(config){
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
    });

    /**
     * Parses Loop elements (e.g. $[object_path : foo == bar])
     * @param templateData
     * @param customHtml
     * @param isNested
     * @returns {*}
     */
    function parseConditionalLoopElement(templateData,customHtml,isNested){
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
                matchingObjects = chaChing.Evaluator.getMatchingObjects(startingObject,condition);
            } else {
                matchingObjects = chaChing.Util.getAllObjects(startingObject);
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
        function parseVariableElement(templateData,customHtml){
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
        function initializeData(data,rootPath,condition){
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
        function initializeDataAll(data,rootPath){

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
         function getStartingObject(data,rootPath){
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

        return{
            config:config,
            parseTemplate:parseTemplate
        }

});
/***** END OF PARSER OBJECT *****/