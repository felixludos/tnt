class NBackendCommunicator {
  constructor(backendUrl) {
    this.serverData = null;
    this.backendUrl = backendUrl;
    this.msgCounter = 0;
    this.callback = null;
  }
  post(url, data, callback) {
    url = backendUrl + url;
    this.msgCounter += 1;
    //console.log(this.msgCounter, "POST request sent: ", url, data);
    $.ajax({
      url: url,
      type: "POST",
      data: JSON.stringify(data),
      processData: false,
      contentType: "application/json; charset=UTF-8",
      success: function(response) {
        //console.log(response);
        callback(response);
      },
      error: function(error) {
        //console.log(error);
      }
    });
  }
  sendOrPost(msg, msgParam, data, callback) {
    if (!empty(msgParam)) msg += "/" + msgParam;
    //console.log(this.msgCounter, "HTTP sent: ", msg);
    if (startsWith(msg, "post")) {
      this.post(msg, data, d => callback(d));
    } else {
      this.send(msg, d => callback(d));
    }
  }

  receive(communicator, serverText, callback, player) {
    //console.log("bin richtig");
    if (startsWith(serverText, "loaded")) {
      communicator.send("refresh/" + player, callback);
    } else {
      serverData = JSON.parse(serverText);
      callback(serverData);
    }
  }

  send(url, callback, player) {
    var communicator = this;
    var receiveFunction = this.receive;
    url = this.backendUrl + url;
    this.msgCounter += 1;
    console.log(this.msgCounter, "request sent: ", url);
    w3.http(url, function() {
      if (this.readyState == 4 && this.status == 200) {
        receiveFunction(communicator,this.responseText, callback, player);
      }
    });
  }
}
