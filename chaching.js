(function () {

    var chaChing = {};

    /**
     * Default Config
     */
    var defaultConfig = {
        debugMode : false,
        suppressRendering : false,
        dataSrc : null,
    }

    /**
     * templates to be rendered
     * @type {{}}
     */
    chaChing.prototype.templates = getTemplates() || {};

    /**
     * Retrieve all cha-ching templates
     * @returns {NodeListOf<Element>}
     */
    function getTemplates(){
        var templates = document.querySelectorAll('script[type="chaching-template"]');

        //get config for each template
        templates.forEach(template => template.config = getTemplateConfig);

        //get html for each template
        templates.forEach(template => template.html = template.innerHTML);

        //get data associated with template
        templates.forEach(template => template.data = getData(template.config.dataSrc));

        return templates;
    }

    /**
     *
     * @param template
     * @returns {{suppressRendering: boolean, debugMode: boolean, dataSrc: null}}
     */
    function getTemplateConfig(template){
        var config = {};

        var debugMode = template.getAttribute("debugMode");
        var dataSrc = template.getAttribute("data-src");
        var suppressRendering = template.getAttribute("suppressRendering");

        config.push({dataSrc:dataSrc, debugMode:debugMode, suppressRendering:suppressRendering});

        return Object.assign(defaultConfig,config);
    }

    /**
     * Retrieve the json from the data source
     * @param dataSrc
     * @returns {*}
     */
    function getData(dataSrc){
        switch (dataSrc){
            //External URL
            case dataSrc.indexOf("http") > 0 :
                return getDataFromURL(dataSrc,true);
            //Internal URL
            case dataSrc.indexOf("http") < 0 && dataSrc.indexOf("/") > 0:
                return getDataFromURL(dataSrc,false);
            //dataSrc is already a valid JSON structure
            default:
                return dataSrc;
        }
    }

    /**
     * Retrieve the json data from an URL
     * @param url
     * @param withCredentials
     * @returns {{}}
     */
    function getDataFromURL(url,withCredentials){

        var data = {};

        var ajaxRequest = new XMLHttpRequest();
        ajaxRequest.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                data = this.responseText;
            }else{
                //log the error in the console
                console.log("Status: " + this.status + "-" + this.responseText);
            }
        };
        ajaxRequest.withCredentials = withCredentials;
        ajaxRequest.open("GET",url,true);
        ajaxRequest.send();

        return data;
    }

    chaChing.prototype.renderTemplates = function renderTemplates(){
        //Retrieve cha-ching templates
        var templates = getTemplates();

        templates.forEach(function (template){
            parseCustomHtml(template.data,template.html,'sort');
        });
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
     * Parse custom content used in columns
     * @param templateData
     * @param customHTML
     * @param type
     * @returns {string}
     */
   function parseCustomHtml(templateData,customHTML,type){
       //Regex to parse our variables (TO-DO: needs to be globalized)
        var variableRegex = /\${(.*?)}(?![^]*(SAS\.DataTable|\[\/\]))/g;
       //Regex to parse looping elements (TO-DO: needs to be globalized)
        var conditionalLoopRegex = /(\$\[(.*)\]([^]+?)\$\[\/\])/g;

        if(conditionalLoopRegex.test(customHTML)){
            customHTML = parseConditionalLoopElement(templateData,customHTML);
        }

       if(variableRegex.test(customHTML)){
            customHTML = parseVariableElement(templateData,customHTML,type);
        }

        return customHTML;
    }

    /**
     * Parses Loop elements (e.g. $[object_path : foo == bar])
     * @param templateData
     * @param customHtml
     * @param isNested
     * @returns {*}
     */
    function parseConditionalLoopElement(templateData,customHtml,isNested){

			var nestedLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\=\=]*\s*\w+]*)\]([^]+?)\[\/\])/g;
        	var outerLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\=\=]*\s*\w+]*)\]([^]+?)\$\[\/\])/g;
            var variableRegex = /\${(.*?)}(?![^]*(SAS\.DataTable|\[\/\]))/g;
            var conditionalLoopRegex = (!isNested) ? outerLoopRegex : nestedLoopRegex;
            var matches;
        	var count = 0;

        	while (matches = conditionalLoopRegex.exec(customHtml)) {

                //the regex is reset every loop, so that it is applied to the beginning of the string
                //instead of at the end of the last match
                if(!isNested){
					conditionalLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\!\=]*\s*\w+]*)\]([^]+?)\$\[\/\])/g;
                }else{
					conditionalLoopRegex = /(\$\[([\w\.]*\s*\:*\s*\w*\s*[\!\=]*\s*\w+[||*\s*\w*\s*[\!\=]*\s*\w+]*)\]([^]+?)\[\/\])/g;
                }

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
                    if(conditionalLoopClause.indexOf("==") > -1){
                        objectPath = '';
                        condition = conditionalLoopClause;
                    }else if(conditionalLoopClause.indexOf("!=") > -1){
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
                            replacementString += parseVariableElement(obj,parsingContent,'display');
                        }else{
                            replacementString += parsingContent;
                        }

                    });

                    customHtml = customHtml.replace(conditionalLoopElement,replacementString);
                }

            }

            return customHtml;

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


    /**
     * Returns objects that meet the condition.
     * @param data
     * @param condition
     * @returns {[]|*[]}
     */
   function getMatchingObjects(data,condition){
       if(!data){
		 return [];
       }

       if(condition.indexOf("!=") >= 0 || condition.indexOf("==") >= 0){
    	   return dataMatchingCondition(data, condition);
       }
   }

    /**
     * Returns all objects
     * @param data
     * @returns {[]|*[]}
     */
   function getAllObjects(data){
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
   
   function xor(a, b) {
	   return (a && !b) || (b && !a);
   }

    /**
     * Evaluates the equals(==) or notEquals (!= or !==) operator for conditional loop elements
     * @param data
     * @param condition
     * @returns {[]}
     */
   function dataMatchingCondition(data,condition){
       var matchingElements = [];
       var notequals = condition.indexOf("!=") >= 0;  //can only have one not-equals, not usable in compounds

       var EQUALS_REGEX = /[a-zA-Z0-9\s\w_]+==[a-zA-Z0-9\s\w_]+/g;
       var localcondition = condition.replace("!==","==").replace("!=", "==");
      
	   if(Array.isArray(data)){
           data.forEach(function(nestedObject,index){
               if(Array.isArray(nestedObject)){
                   nestedObject.forEach(function(object,index){
                        localcondition.match(EQUALS_REGEX).forEach(function(predicate,index){
                            var key = predicate.split("==")[0].trim();
                            var value = predicate.split("==")[1].trim();
                            if(typeof object[key] !== 'undefined' && xor(object[key].toString()==value,notequals)){
                                matchingElements.push(object);
                            }
                       });

                   });
               }else{
                   localcondition.match(EQUALS_REGEX).forEach(function(predicate,index){
                       var key = predicate.split("==")[0].trim();
                       var value = predicate.split("==")[1].trim();

                       if(typeof nestedObject[key] !== 'undefined' && xor(nestedObject[key].toString()==value,notequals)){
                           matchingElements.push(nestedObject);
                       }
                   });


               }
           });
       }else{
		condition.match(EQUALS_REGEX).forEach(function(predicate,index){
            var key = predicate.split("==")[0].trim();
            var value = predicate.split("==")[1].trim();

            if(data[key].toString()===value){
                matchingElements.push(data);
            }

       });

       }

       return matchingElements;
   }

    /**
     * Parses Variable elements (e.g. ${value|default_value|date_format})
     * @param templateData
     * @param customHtml
     * @param type
     * @returns {string|*}
     */
   function parseVariableElement(templateData,customHtml,type){

       if(typeof(templateData)=="undefined" || !templateData){
           return customHtml;
       }

          var replacementString = "";
          var sortString = "";
          var variableRegex = /\${(.*?)}(?![^]*(SAS\.DataTable|\[\/\]))/g;

          customHtml.match(variableRegex).forEach(function(variable,index){
              var propertyArray = variable.split(/\|/);
              var property = (variable.indexOf("|") >= 0) ? propertyArray[0].replace("{","").replace(/\$/g,"") : variable.replace("{","").replace(/\$/g,"").replace("}","");
              var defaultValue = (variable.indexOf("|") >= 0) ? propertyArray[1].replace("}","") : '';
              var dateTimeFormat = (propertyArray.length > 2) ? propertyArray[2].replace("}","") : '';
              var propertyValue = "null";
              if (property == "this" && typeof templateData === 'string' ) {
            	  propertyValue = templateData;
              } else if(property.indexOf('.') >= 0) {
                  var obj = SAS.Utils.getObject(templateData, property);
                  if(typeof obj === "number") {
                      obj = JSON.stringify(obj);
                  }
                  propertyValue = obj;
              } else {
                  propertyValue = templateData[property];
                  if (typeof propertyValue === 'undefined' && typeof templateData[0] === 'object' && templateData[0] !== null) {
                	  propertyValue = templateData[0][property];
                  }
              } 

              sortString = propertyValue;
              /* if datetime format provided, attempt to use it, else default to blank so defaultValue potentially used */
              if (dateTimeFormat.length > 0 && typeof propertyValue === "string" && typeof moment !== 'undefined') {
                  moment.locale(document.documentElement.lang || window.navigator.language || 'en');
                  var date = moment(propertyValue.replace(" ",""));
                  propertyValue = (date._isValid) ? date.format(dateTimeFormat) : "";
                  sortString = date.format('YYYYMMDD');
                  templateData[property + "_sort"] = sortString;
              }
              replacementString = (propertyValue) ? propertyValue : defaultValue;
              customHtml = customHtml.replace(variable,replacementString);
          });

          if (type == 'sort' || type == 'type') {
        	  return sortString;
          }
          return customHtml;

      }

})(chaching||{});

chaching.renderTemplates();