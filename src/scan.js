
/**
  *Scanner object that traverses the DOM for chaching templates and builds
  *config objects for each template
  */

chaChing.Scanner= (function() {

         /**
         * Generate hash of template for caching purposes
         * @param string
         * @returns {number}
         */
        var generateHashFromTemplate = (function(string) {
            var hash = 0;
            if (string.length == 0)
                return hash;
            for (let i = 0; i < string.length; i++) {
                var charCode = string.charCodeAt(i);
                hash = ((hash << 7) - hash) + charCode;
                hash = hash & hash;
            }
            return hash;
    
        });
    
        /**
          * Scan the DOM for all cha-ching templates
          * @returns Array of template configs
          */
        var scan = (function(){
    
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
                };
    
             var templates = document.querySelectorAll('script[type="chaching-template"]');
    
             var templateConfigs = [];
    
             templates.forEach(function(template,index){
                 var config ={...defaultConfig};
                 config.debugMode = template.getAttribute("debugMode");
                 config.dataSrc = template.getAttribute("data-src");
                 config.rootPath = template.getAttribute("rootPath");
                 config.html = template.innerHTML
                 config.cache = generateHashFromTemplate(template.innerHTML);
    
                 template.setAttribute("id","chaching-"+config.cache);
    
                 config.data = chaChing.Getter.getData(config);
                 templateConfigs.push(config);
             });
    
    
             console.log(templateConfigs);
    
             return templateConfigs;
        });

        return{
            generateHashFromTemplate:generateHashFromTemplate,
            scan:scan
        };

});