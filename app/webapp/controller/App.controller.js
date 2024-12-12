sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("createsofromchat.controller.App", {
        onInit: function() {
          sessionStorage.setItem("isDeployedVersion", "false");
        }
      });
    }
  );
  